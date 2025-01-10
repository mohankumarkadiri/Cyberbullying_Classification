import os
from typing import Tuple, Optional
import numpy as np
import cv2
import speech_recognition as sr
import pytesseract
import tempfile
from pytesseract import Output
from moviepy.editor import VideoFileClip
from pydub import AudioSegment
import subprocess


def preprocess_image(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    gray = cv2.dilate(gray, kernel, iterations=1)

    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    return gray


def process_image(image_path: str):
    try:
        image = cv2.imread(image_path)

        height, width, _ = image.shape

        preprocessed = preprocess_image(image)

        custom_config = r"--oem 3 --psm 6"

        details = pytesseract.image_to_data(
            preprocessed, output_type=Output.DICT, config=custom_config
        )

        parsed_text = []
        confidences = []
        boxes = []

        for i in range(len(details["text"])):
            if float(details["conf"][i]) > 0:
                text = details["text"][i].strip()
                if text:
                    parsed_text.append(text)
                    confidences.append(float(details["conf"][i]))
                    x = details["left"][i] / width
                    y = details["top"][i] / height
                    w = details["width"][i] / width
                    h = details["height"][i] / height
                    boxes.append({"x": x, "y": y, "width": w, "height": h})

        full_text = pytesseract.image_to_string(preprocessed, config=custom_config)

        if not full_text.strip():
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)[1]
            full_text = pytesseract.image_to_string(thresh, config=custom_config)

        return {
            "extracted_text": full_text.strip(),
            "word_data": {
                "words": parsed_text,
                "confidences": confidences,
                "boxes": boxes,
            },
            "average_confidence": np.mean(confidences) if confidences else 0,
            "preprocessing_info": {
                "original_size": f"{width}x{height}",
                "preprocessing_steps": [
                    "grayscale_conversion",
                    "otsu_thresholding",
                    "dilation",
                    "gaussian_blur",
                ],
            },
        }, None
    except Exception as error:
        print(f"⛔ Image Error: {error}")
        return None, error


def get_audio_format(file_path: str) -> str:
    return os.path.splitext(file_path)[1][1:].lower()


def convert_to_wav(audio_path: str) -> Tuple[Optional[str], Optional[Exception]]:
    temp_dir = tempfile.mkdtemp()
    temp_wav = os.path.join(temp_dir, "converted_audio.wav")

    try:
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Input audio file not found: {audio_path}")

        audio_format = get_audio_format(audio_path)

        if audio_format == "wav":
            import shutil

            shutil.copy2(audio_path, temp_wav)
            return temp_wav, None

        try:
            audio = AudioSegment.from_file(audio_path, format=audio_format)
            audio.export(temp_wav, format="wav")
            if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 0:
                return temp_wav, None
        except:
            try:
                result = subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        audio_path,
                        "-acodec",
                        "pcm_s16le",
                        "-ar",
                        "44100",
                        temp_wav,
                    ],
                    capture_output=True,
                    text=True,
                )

                if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 0:
                    return temp_wav, None
                else:
                    raise Exception(f"FFmpeg conversion failed: {result.stderr}")
            except Exception as e:
                raise Exception(f"Both pydub and FFmpeg conversion failed: {str(e)}")

    except Exception as error:
        cleanup_temp_files(temp_dir, temp_wav)
        return None, error


def process_audio(audio_path: str):
    temp_wav = None
    temp_dir = None

    try:
        temp_wav, conversion_error = convert_to_wav(audio_path)
        if conversion_error:
            return None, conversion_error

        recognizer = sr.Recognizer()
        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        recognizer.pause_threshold = 0.8

        with sr.AudioFile(temp_wav) as source:
            audio = recognizer.record(source)

        results = {"google_text": "", "whisper_text": ""}
        errors = []

        recognition_services = [
            ("google", lambda: recognizer.recognize_google(audio)),
            ("whisper", lambda: recognizer.recognize_whisper(audio)),
        ]

        for service_name, recognition_func in recognition_services:
            try:
                results[f"{service_name}_text"] = recognition_func()
            except Exception as e:
                errors.append(f"{service_name} recognition error: {str(e)}")
                continue

        if not any(results.values()):
            return None, Exception(
                f"All speech recognition attempts failed: {'; '.join(errors)}"
            )

        return {
            "extracted_text": next((text for text in results.values() if text), ""),
            **results,
            "audio_info": {
                "original_format": get_audio_format(audio_path),
                "conversion_successful": True,
                "recognition_errors": errors if errors else None,
            },
        }, None

    except Exception as error:
        return None, error
    finally:
        cleanup_temp_files(temp_dir, temp_wav)


def process_video(video_path: str):
    temp_dir = tempfile.mkdtemp()
    video = None

    try:
        video = VideoFileClip(video_path)

        # Extract audio and process it
        temp_audio = os.path.join(temp_dir, "temp_audio.wav")
        video.audio.write_audiofile(
            temp_audio, codec="pcm_s16le", verbose=False, logger=None
        )

        audio_result, audio_error = process_audio(temp_audio)
        if audio_error:
            print(f"Warning: Audio processing failed: {audio_error}")
            audio_result = {"extracted_text": ""}

        # Process video frames
        frame_texts = []
        frame_data = []
        duration = int(video.duration)

        # Sample frames at 1 frame per second
        for t in range(0, duration, 1):
            try:
                frame = video.get_frame(t)
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

                frame_result, frame_error = process_image_from_array(frame)
                if frame_error:
                    continue

                if frame_result and frame_result.get("extracted_text"):
                    text = frame_result["extracted_text"].strip()
                    if text:  # Only add non-empty texts
                        frame_texts.append(text)
                        frame_data.append(
                            {
                                "timestamp": t,
                                "text": text,
                                "confidence": frame_result.get("average_confidence", 0),
                            }
                        )
            except Exception as frame_error:
                print(f"Warning: Frame processing error at {t}s: {frame_error}")
                continue

        seen = set()
        unique_frame_texts = [x for x in frame_texts if not (x in seen or seen.add(x))]

        return {
            "extracted_text": f"{audio_result['extracted_text']}; {' '.join(unique_frame_texts)}".strip(),
            "audio_text": audio_result.get("extracted_text", ""),
            "frame_texts": unique_frame_texts,
            "frame_data": frame_data,
            "metadata": {
                "duration": duration,
                "frames_processed": len(frame_data),
                "unique_text_frames": len(unique_frame_texts),
            },
        }, None

    except Exception as error:
        return None, error
    finally:
        if video:
            video.close()
        cv2.destroyAllWindows()
        cleanup_temp_files(temp_dir, None)


def cleanup_temp_files(temp_dir: Optional[str], temp_wav: Optional[str]):
    try:
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)
        if temp_dir and os.path.exists(temp_dir):
            for file in os.listdir(temp_dir):
                try:
                    os.remove(os.path.join(temp_dir, file))
                except:
                    pass
            os.rmdir(temp_dir)
    except Exception as e:
        print(f"Warning: Failed to clean up temporary files: {str(e)}")


def process_image_from_array(image_array):
    temp_file = None
    try:
        temp_dir = tempfile.gettempdir()
        temp_name = next(tempfile._get_candidate_names())
        temp_path = os.path.join(temp_dir, f"{temp_name}.png")

        cv2.imwrite(temp_path, image_array)

        result, error = process_image(temp_path)

        cv2.destroyAllWindows()

        try:
            os.remove(temp_path)
        except Exception as cleanup_error:
            print(
                f"Warning: Failed to remove temporary file {temp_path}: {cleanup_error}"
            )

        return result, error

    except Exception as error:
        print(f"⛔ Image Array Error: {error}")
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        return None, error


def process_input(file_path: str, file_type: str):
    if not os.path.exists(file_path):
        return None, FileNotFoundError(f"File not found: {file_path}")

    processors = {
        "image": process_image,
        "audio": process_audio,
        "video": process_video,
    }

    if file_type not in processors:
        return None, ValueError(f"Unsupported file type: {file_type}")

    try:
        result, error = processors[file_type](file_path)
        if error:
            return None, error
        return result, None
    except Exception as error:
        return None, error


def is_supported_format(filename: str) -> Tuple[bool, str]:
    extension = filename.lower().split(".")[-1]

    format_types = {
        "image": ["jpg", "jpeg", "png", "bmp", "tiff"],
        "audio": ["wav", "mp3", "ogg", "flac", "m4a", "aac", "wma"],
        "video": ["mp4", "avi", "mov", "mkv", "webm"],
    }

    for file_type, extensions in format_types.items():
        if extension in extensions:
            return True, file_type

    return False, "File format not supported"

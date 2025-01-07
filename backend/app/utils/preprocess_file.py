import os
from typing import Dict, Tuple, Optional
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


def get_audio_format(file_path: str):
    return file_path.lower().split(".")[-1]


def convert_to_wav(audio_path: str):
    audio_path = audio_path.replace('/', '\\')
    temp_dir = None
    temp_wav = None
    try:
        temp_dir = tempfile.mkdtemp()
        temp_wav = os.path.join(temp_dir, "converted_audio.wav")
        
        print(f"temp_dir: {temp_dir}")
        
        print(f"Converting audio file to WAV: {audio_path} -> {temp_wav}")

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Input audio file not found: {audio_path}")

        audio_format = get_audio_format(audio_path)

        if audio_format == "wav":
            import shutil
            shutil.copy2(audio_path, temp_wav)
        else:
            try:
                if audio_format == "mp3":
                    audio = AudioSegment.from_mp3(audio_path)
                elif audio_format == "ogg":
                    audio = AudioSegment.from_ogg(audio_path)
                elif audio_format == "flv":
                    audio = AudioSegment.from_flv(audio_path)
                elif audio_format in ["m4a", "aac"]:
                    audio = AudioSegment.from_file(audio_path, format="m4a")
                elif audio_format == "wma":
                    result = subprocess.run(
                        [
                            "ffmpeg",
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
                        check=True,
                    )
                    if result.returncode != 0:
                        raise Exception(f"FFmpeg conversion failed: {result.stderr}")
                    return temp_wav, None
                else:
                    audio = AudioSegment.from_file(audio_path)

                audio.export(temp_wav, format="wav")
            except subprocess.CalledProcessError as e:
                raise Exception(f"FFmpeg conversion failed: {e.stderr}")
            except Exception as e:
                raise Exception(f"Audio conversion failed for format {audio_format}: {str(e)}")

        if not os.path.exists(temp_wav) or os.path.getsize(temp_wav) == 0:
            raise Exception("Converted WAV file is missing or empty")

        return temp_wav, None

    except Exception as error:
        cleanup_temp_files(temp_dir, temp_wav)
        print(f"⛔ Audio Conversion Error: {str(error)}")
        return None, error

def cleanup_temp_files(temp_dir: Optional[str], temp_wav: Optional[str]):
    """Helper function to clean up temporary files"""
    try:
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)
        if temp_dir and os.path.exists(temp_dir):
            os.rmdir(temp_dir)
    except Exception as e:
        print(f"Warning: Failed to clean up temporary files: {str(e)}")


def process_audio(audio_path: str):
    try:
        wav_path, conversion_error = convert_to_wav(audio_path)
        if conversion_error:
            return None, conversion_error

        recognizer = sr.Recognizer()

        recognizer.energy_threshold = 300
        recognizer.dynamic_energy_threshold = True
        recognizer.pause_threshold = 0.8

        with sr.AudioFile(wav_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = recognizer.record(source)

        results = {}
        errors = []

        try:
            results["google_text"] = recognizer.recognize_google(audio)
        except Exception as e:
            print(f"⛔ Google recognition error: {str(e)}")
            errors.append(f"Google recognition error: {str(e)}")
            results["google_text"] = ""

        try:
            results["whisper_text"] = recognizer.recognize_whisper(audio)
        except Exception as e:
            print(f"⛔ Whisper recognition error: {str(e)}")
            errors.append(f"Whisper recognition error: {str(e)}")
            results["whisper_text"] = ""

        if os.path.exists(wav_path):
            os.remove(wav_path)
        temp_dir = os.path.dirname(wav_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)

        if not results["google_text"] and not results["whisper_text"]:
            print(f"⛔ Speech recognition failed: {'; '.join(errors)}")
            return None, Exception(f"Speech recognition failed: {'; '.join(errors)}")

        return {
            "extracted_text": results["google_text"] or results["whisper_text"],
            "google_text": results["google_text"],
            "whisper_text": results["whisper_text"],
            "audio_info": {
                "original_format": get_audio_format(audio_path),
                "conversion_successful": True,
                "recognition_errors": errors if errors else None,
            },
        }, None

    except Exception as error:
        print(f"⛔ Audio Error: {error}")
        if "wav_path" in locals() and os.path.exists(wav_path):
            os.remove(wav_path)
            temp_dir = os.path.dirname(wav_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        return None, error


import os
import tempfile
from moviepy.editor import VideoFileClip
import cv2

def process_video(video_path: str):
    texts = []
    temp_dir = None

    try:
        temp_dir = tempfile.mkdtemp()

        video = VideoFileClip(video_path)
        temp_audio = os.path.join(temp_dir, "temp_audio.wav")
        video.audio.write_audiofile(temp_audio, codec="pcm_s16le")

        audio_result, audio_error = process_audio(temp_audio)
        if audio_error:
            raise RuntimeError(f"Audio processing failed: {audio_error}")

        frame_texts = []
        frame_data = []

        for t in range(0, int(video.duration), 1):
            frame = video.get_frame(t)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            frame_result, frame_error = process_image_from_array(frame)
            if frame_error:
                print(f"⚠️ Frame processing error at timestamp {t}: {frame_error}")
                continue

            if frame_result and frame_result.get("extracted_text"):
                extracted_text = frame_result["extracted_text"]
                frame_texts.append(extracted_text)
                frame_data.append({
                    "timestamp": t,
                    "text": extracted_text,
                    "confidence": frame_result.get("average_confidence", 0),
                })

        video.close()

        if temp_dir:
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)

        frame_texts = list(set(frame_texts))

        return {
            "extracted_text": f"{audio_result['extracted_text']} {' '.join(frame_texts)}".strip(),
            "audio_text": audio_result["extracted_text"],
            "frame_texts": frame_texts,
            "frame_data": frame_data,
            "metadata": {
                "duration": video.duration,
                "frames_processed": len(frame_texts),
            },
        }, None

    except Exception as error:
        print(f"⛔ Video Error: {error}")
        return None, error

    finally:
        if temp_dir and os.path.exists(temp_dir):
            for file in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file)
                try:
                    os.remove(file_path)
                except Exception as cleanup_error:
                    print(f"⚠️ Failed to remove temporary file {file_path}: {cleanup_error}")
            try:
                os.rmdir(temp_dir)
            except Exception as cleanup_error:
                print(f"⚠️ Failed to remove temporary directory {temp_dir}: {cleanup_error}")



def process_image_from_array(image_array):
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
            cv2.imwrite(temp_file.name, image_array)
            result, error = process_image(temp_file.name)
            os.unlink(temp_file.name)
            return result, error
    except Exception as error:
        print(f"⛔ Image Array Error: {error}")
        return None, error

def process_input(file_path: str, file_type: str):
    try:
        if not os.path.exists(file_path):
            print(f"⛔ Error: File not found: {file_path}")
            return None, "Internal Server Error"

        processors = {
            "image": process_image,
            "audio": process_audio,
            "video": process_video,
        }

        if file_type not in processors:
            return None, f"Unsupported file type: {file_type}"

        result, error = processors[file_type](file_path)

        if error:
            return None, error

        if result and "extracted_text" in result:
            return result["extracted_text"], None

    except Exception as error:
        print(f"⛔ Input Error: {error}")
        return None, error


def is_supported_format(filename: str) -> Tuple[bool, str]:
    extension = filename.lower().split(".")[-1]

    format_types = {
        "image": ["jpg", "jpeg", "png", "bmp", "tiff"],
        "audio": ["wav", "mp3", "ogg", "flac"],
        "video": ["mp4", "avi", "mov", "mkv"],
    }

    for file_type, extensions in format_types.items():
        if extension in extensions:
            return True, file_type

    print(f"⛔ Unsupported Format: {extension}")
    return False, ""

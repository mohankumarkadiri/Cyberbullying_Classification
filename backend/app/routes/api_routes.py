from flask import Blueprint, request, jsonify, current_app
import os
from app.utils.model import classify_text
from werkzeug.utils import secure_filename
from app.utils.preprocess_file import process_input


api_bp = Blueprint("api", __name__)


UPLOAD_FOLDER = current_app.config["UPLOAD_FOLDER"]
ALLOWED_EXTENSIONS = {
    "image": ["jpg", "jpeg", "png", "bmp", "tiff"],
    "audio": ["wav", "mp3", "ogg", "flac"],
    "video": ["mp4", "avi", "mov", "mkv"],
}


# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename: str):
    extension = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    return extension in [ext for types in ALLOWED_EXTENSIONS.values() for ext in types]


def get_file_type(filename: str):
    extension = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return file_type
    return None


@api_bp.route("/predict", methods=["POST"])
def predict():
    try:
        if "file" in request.files:
            file = request.files["file"]

            if not file.filename:
                return jsonify({"message": "No selected file"}), 400

            if not allowed_file(file.filename):
                return jsonify({"message": "File type not allowed"}), 400

            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)

            try:
                file_type = get_file_type(filename)
                if not file_type:
                    return jsonify({"message": "Unsupported file type"}), 400

                extracted_text, error = process_input(file_path, file_type)

                print(f"Extracted text: {extracted_text}")
                # os.remove(file_path)

                if error:
                    print(f"⛔ Error processing file: {error}")
                    return jsonify({"message": str(error)}), 500
                if not extracted_text:
                    print("⛔ No text extracted")
                    return jsonify({"message": "No text extracted"}), 400
                
                
                prediction, error = classify_text(extracted_text)

                if error:
                    print(f"⛔ Error classifying text: {error}")
                    return jsonify({"message": str(error)}), 500
                
                prediction.update({"extracted_text": extracted_text})

                return jsonify(prediction), 200

            except Exception as e:
                print(f"⛔ Error processing file: {str(e)}")
                if os.path.exists(file_path):
                    os.remove(file_path)
                return (
                    jsonify({"error": f"INTERNAL SERVER ERROR: {str(e)}"}),
                    500,
                )

        elif request.is_json:
            data = request.json
            input_text = data.get("text", None)

            if not input_text:
                return jsonify({"message": "No text provided"}), 400

            prediction, error = classify_text(input_text)

            if error:
                return jsonify({"message": str(error)}), 500

            return jsonify(prediction), 200

        else:
            return jsonify({"message": "Invalid request format"}), 400

    except Exception as e:
        return (
            jsonify({"error": f"INTERNAL SERVER ERROR: {str(e)}"}),
            500,
        )

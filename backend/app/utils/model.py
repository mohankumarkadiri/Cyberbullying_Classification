from flask import current_app
import torch
from torch import nn
from transformers import BertTokenizer, BertModel


class BERTClassifier(nn.Module):
    def __init__(self, bert_model_name, num_classes):
        super(BERTClassifier, self).__init__()
        self.bert = BertModel.from_pretrained(bert_model_name)
        self.dropout = nn.Dropout(0.1)
        self.fc = nn.Linear(self.bert.config.hidden_size, num_classes)

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        x = self.dropout(pooled_output)
        logits = self.fc(x)
        return logits


# model information
bert_model_name = "bert-base-uncased"
max_length = 128
classes = ["cyberbullying", "not_cyberbullying"]
num_classes = len(classes)

# model settings
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = BERTClassifier(bert_model_name, num_classes).to(device)
tokenizer = BertTokenizer.from_pretrained(bert_model_name)

# Load the saved weights
model.load_state_dict(torch.load(current_app.config["MODEL_PATH"], map_location=device))


def classify_text(text):
    try:
        model.eval()
        encoding = tokenizer(
            text,
            return_tensors="pt",
            max_length=max_length,
            padding="max_length",
            truncation=True,
        )
        input_ids = encoding["input_ids"].to(device)
        attention_mask = encoding["attention_mask"].to(device)

        with torch.no_grad():
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            confidence, prediction = torch.max(outputs, dim=1)
        return {
            "predicted_label": classes[prediction.item()],
            "confidence": float(confidence.item()),
            "probabilities": {
                class_name: float(prob)
                for class_name, prob in zip(classes, outputs[0].tolist())
            },
        }, None
    except Exception as error:
        return None, error

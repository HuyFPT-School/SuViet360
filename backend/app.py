import torch
import faiss
import pandas as pd
import numpy as np
import re
import os
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from sentence_transformers import SentenceTransformer

# ============================================================
# PHẦN 1: KHỞI TẠO MODEL & RAG (Chạy trên CPU)
# ============================================================

BASE_MODEL_ID = "Qwen/Qwen3-0.6B"
ADAPTER_PATH  = "./adapter"      # Nằm ngay trong thư mục app trên Hugging Face
RAG_DIR       = "./rag_index"    # Nằm ngay trong thư mục app trên Hugging Face

print("Đang load model (chế độ CPU)...")
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_ID,
    torch_dtype=torch.float32,   # Sử dụng float32 để tương thích tốt nhất trên CPU
    device_map="cpu",            # Ép chạy trên CPU
    trust_remote_code=True,
)

# Nạp LoRA Adapter nếu có thư mục adapter
if os.path.exists(ADAPTER_PATH) and any(f.endswith('.json') or f.endswith('.safetensors') or f.endswith('.bin') for f in os.listdir(ADAPTER_PATH)):
    print("Đang nạp LoRA Adapter...")
    model = PeftModel.from_pretrained(model, ADAPTER_PATH)
model.eval()
print("Load model xong!")

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
print("Load tokenizer xong!")

# Nạp FAISS index + database
print("Đang load RAG...")
embed_model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

faiss_path = os.path.join(RAG_DIR, "kb_index.faiss")
csv_path = os.path.join(RAG_DIR, "kb_data.csv")

if os.path.exists(faiss_path) and os.path.exists(csv_path):
    faiss_index = faiss.read_index(faiss_path)
    df_kb       = pd.read_csv(csv_path)
    print(f"Load RAG xong! Đã nạp {faiss_index.ntotal} vector tri thức.")
else:
    faiss_index = None
    df_kb = None
    print("CẢNH BÁO: Không tìm thấy file RAG index hoặc CSV. Hệ thống sẽ chạy không có RAG.")

# ============================================================
# PHẦN 2: LOGIC XỬ LÝ (Tương tự Colab)
# ============================================================

SYSTEM_PROMPT_RAG = (
    "Bạn là một chuyên gia Lịch sử Việt Nam. "
    "Dựa CHÍNH XÁC vào thông tin tham khảo được cung cấp để trả lời câu hỏi. "
    "Nếu thông tin tham khảo không đủ để trả lời, hãy nói rõ là không có đủ thông tin. "
    "Trả lời ngắn gọn, chính xác, bám sát sự kiện lịch sử. "
    "CHỈ trả lời đúng nội dung được hỏi, KHÔNG đặt thêm câu hỏi ngược lại, "
    "KHÔNG mời gợi tiếp tục cuộc trò chuyện. Dừng lại ngay sau khi trả lời xong."
)

def retrieve(question, top_k=3, min_score=0.4):
    if faiss_index is None or df_kb is None:
        return []
    query_vec = embed_model.encode([question], convert_to_numpy=True, normalize_embeddings=True)
    scores, indices = faiss_index.search(query_vec, top_k)
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if score < min_score:
            continue
        results.append({
            "question": df_kb.iloc[idx]["question"],
            "answer":   df_kb.iloc[idx]["answer"],
            "score":    float(score),
        })
    return results

def build_rag_prompt(question, retrieved):
    if retrieved:
        context_text = "\n".join(f"- {r['question']} => {r['answer']}" for r in retrieved)
    else:
        context_text = "(Không tìm thấy thông tin tham khảo liên quan)"

    return [
        {"role": "system", "content": SYSTEM_PROMPT_RAG},
        {"role": "user",   "content": f"Thông tin tham khảo:\n{context_text}\n\nCâu hỏi: {question}"},
    ]

def generate_with_rag(question, top_k=3, min_score=0.4, max_new_tokens=150):
    retrieved = retrieve(question, top_k=top_k, min_score=min_score)
    messages  = build_rag_prompt(question, retrieved)
    prompt    = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs    = tokenizer(prompt, return_tensors="pt") # Chạy trên CPU nên không cần .to(model.device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            eos_token_id=tokenizer.eos_token_id,
        )

    new_tokens = output_ids[0][inputs["input_ids"].shape[1]:]
    answer = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    answer = re.sub(r"<think>.*?</think>\s*", "", answer, flags=re.DOTALL).strip()
    return answer, retrieved

# ============================================================
# PHẦN 3: API ENDPOINT (FastAPI)
# ============================================================

app = FastAPI(title="SuViet360 AI RAG Chatbot")

class QueryRequest(BaseModel):
    question: str

@app.post("/ask")
def ask(req: QueryRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Câu hỏi không được để trống")
    
    start_time = time.time()
    try:
        answer, retrieved = generate_with_rag(question)
        return {
            "success": True,
            "answer": answer,
            "has_context": len(retrieved) > 0,
            "sources": retrieved,
            "latency_ms": int((time.time() - start_time) * 1000),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/")
def home():
    return {"status": "running", "message": "SuViet360 AI Chatbot Server is active!"}

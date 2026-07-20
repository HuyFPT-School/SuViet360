import sys
import os
import traceback

# ============================================================
# In ngay lập tức để xác nhận handler.py đã được chạy
# ============================================================
print("[SuViet360] handler.py đang khởi động...", flush=True)
print(f"[SuViet360] Python version: {sys.version}", flush=True)
print(f"[SuViet360] Working dir: {os.getcwd()}", flush=True)

try:
    import runpod
    print("[SuViet360] Import runpod OK", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Import runpod failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

try:
    import torch
    print(f"[SuViet360] Import torch OK - CUDA available: {torch.cuda.is_available()}", flush=True)
    if torch.cuda.is_available():
        print(f"[SuViet360] GPU: {torch.cuda.get_device_name(0)}", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Import torch failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

try:
    import faiss
    print("[SuViet360] Import faiss OK", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Import faiss failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

try:
    import pandas as pd
    import numpy as np
    import re
    import time
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel
    from sentence_transformers import SentenceTransformer
    print("[SuViet360] Import tất cả thư viện OK", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Import thư viện failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

# ============================================================
# PHẦN 1: KHỞI TẠO (chạy 1 lần duy nhất khi server bật)
# ============================================================

BASE_MODEL_ID = "Qwen/Qwen3-0.6B"

# Kiểm tra đường dẫn adapter
for path in ["/runpod-volume/adapter", "/workspace/adapter"]:
    print(f"[SuViet360] Kiểm tra {path}: exists={os.path.exists(path)}", flush=True)

ADAPTER_PATH = "/runpod-volume/adapter" if os.path.exists("/runpod-volume/adapter") else "/workspace/adapter"

# Kiểm tra đường dẫn RAG
for path in ["/runpod-volume/rag_index", "/workspace/rag_index"]:
    print(f"[SuViet360] Kiểm tra {path}: exists={os.path.exists(path)}", flush=True)

RAG_DIR = "/runpod-volume/rag_index" if os.path.exists("/runpod-volume/rag_index") else "/workspace/rag_index"

print(f"[SuViet360] ADAPTER_PATH = {ADAPTER_PATH}", flush=True)
print(f"[SuViet360] RAG_DIR      = {RAG_DIR}", flush=True)

try:
    print(f"[SuViet360] Đang load model {BASE_MODEL_ID} (GPU float16)...", flush=True)
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_ID,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(model, ADAPTER_PATH)
    model.eval()
    print("[SuViet360] Load model xong!", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Load model failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

try:
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
    print("[SuViet360] Load tokenizer xong!", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Load tokenizer failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

try:
    print("[SuViet360] Đang load RAG...", flush=True)
    embed_model = SentenceTransformer(
        "bkai-foundation-models/vietnamese-bi-encoder"
    )
    faiss_index = faiss.read_index(os.path.join(RAG_DIR, "kb_index.faiss"))
    df_kb = pd.read_csv(os.path.join(RAG_DIR, "kb_data.csv"))
    print(f"[SuViet360] Load RAG xong! {faiss_index.ntotal} vectors.", flush=True)
except Exception as e:
    print(f"[SuViet360] FATAL: Load RAG failed: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

# ============================================================
# PHẦN 2: LOGIC (copy từ notebook DecoderOnly)
# ============================================================

SYSTEM_PROMPT_RAG = (
    "Bạn là một trợ lý trả lời câu hỏi lịch sử, CHỈ được phép dùng thông tin "
    "xuất hiện trong phần 'Thông tin tham khảo' được cung cấp trong mỗi câu hỏi.\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1. TUYỆT ĐỐI KHÔNG dùng kiến thức có sẵn của bạn, kể cả khi bạn nghĩ mình biết đáp án. "
    "Chỉ được lấy thông tin có trong đoạn tham khảo.\n"
    "2. Trước khi trả lời, hãy tự xác định trong đầu câu/đoạn nào trong tham khảo chứa đáp án, "
    "rồi trả lời đúng theo đúng nội dung đó. KHÔNG suy diễn, KHÔNG đoán, KHÔNG lấy nhầm "
    "một tên riêng/mốc thời gian khác xuất hiện trong đoạn văn nếu nó không phải là đáp án "
    "cho đúng câu hỏi được nêu ra.\n"
    "3. Nếu các nguồn tham khảo mâu thuẫn nhau hoặc không đủ để trả lời, hãy nói rõ: "
    "'Thông tin tham khảo không đủ để trả lời câu hỏi này.'\n"
    "4. Trả lời ngắn gọn, chính xác, đúng trọng tâm câu hỏi, bám sát đúng sự kiện lịch sử "
    "nêu trong tham khảo.\n"
    "5. KHÔNG đặt thêm câu hỏi ngược lại, KHÔNG mời gợi tiếp tục cuộc trò chuyện. "
    "Dừng lại ngay sau khi trả lời xong."
)

def retrieve(question, top_k=3, min_score=0.5):
    query_vec = embed_model.encode(
        [question], convert_to_numpy=True, normalize_embeddings=True
    )
    scores, indices = faiss_index.search(query_vec, top_k)
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(df_kb):
            continue
        if score < min_score:
            continue
        
        row = df_kb.iloc[idx]
        if "question" in row and "answer" in row:
            q = row["question"]
            a = row["answer"]
        else:
            q = row.get("bai", "Kiến thức Lịch sử")
            a = row.get("text", "")

        results.append({
            "question": q,
            "answer":   a,
            "score":    float(score),
        })
    return results

def build_rag_prompt(question, retrieved):
    if retrieved:
        context_text = "\n\n".join(
            f"Nguồn {i+1} ({r['question']}): {r['answer']}"
            for i, r in enumerate(retrieved)
        )
    else:
        context_text = "(Không tìm thấy thông tin tham khảo liên quan)"
        
    user_content = (
        f"Thông tin tham khảo:\n{context_text}\n\n"
        f"Câu hỏi: {question}\n\n"
        f"Hãy trả lời DUY NHẤT dựa vào các nguồn tham khảo ở trên, "
        f"không dùng kiến thức ngoài đoạn văn."
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT_RAG},
        {"role": "user", "content": user_content},
    ]

def generate_with_rag(question, top_k=3, min_score=0.5, max_new_tokens=150):
    retrieved = retrieve(question, top_k=top_k, min_score=min_score)
    messages  = build_rag_prompt(question, retrieved)
    prompt    = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

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
# PHẦN 3: RUNPOD HANDLER
# ============================================================

def handler(job):
    start  = time.time()
    inp    = job["input"]
    question = (inp.get("question") or "").strip()

    if not question:
        return {"success": False, "error": "Câu hỏi rỗng"}

    try:
        answer, retrieved = generate_with_rag(question)
        return {
            "success":     True,
            "answer":      answer,
            "has_context": len(retrieved) > 0,
            "sources":     retrieved,
            "latency_ms":  int((time.time() - start) * 1000),
        }
    except Exception as e:
        print(f"[SuViet360] Handler error: {e}", flush=True)
        traceback.print_exc()
        return {"success": False, "error": str(e)}


print("[SuViet360] Tất cả đã sẵn sàng! Khởi động RunPod Serverless handler...", flush=True)
runpod.serverless.start({"handler": handler})

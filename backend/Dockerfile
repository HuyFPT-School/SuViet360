FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /suviet360

# Bước 1: Nâng cấp PyTorch lên 2.5.1 (phiên bản cuối cùng hỗ trợ CUDA 11.8)
# Cần PyTorch >= 2.5 vì transformers mới cần torch.distributed.tensor.DTensor
RUN pip install --no-cache-dir \
    torch==2.5.1 \
    torchvision==0.20.1 \
    torchaudio==2.5.1 \
    --index-url https://download.pytorch.org/whl/cu118

# Bước 2: Cài các thư viện ML
RUN pip install --no-cache-dir \
    "numpy<2" \
    runpod \
    transformers \
    peft \
    accelerate \
    faiss-gpu \
    sentence-transformers \
    pandas

COPY handler.py .

ENTRYPOINT []
CMD ["python", "-u", "handler.py"]

import modal

app = modal.App("food-tracker")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch", "torchvision", "transformers", "accelerate", "qwen-vl-utils",
        "pillow", "requests", "fastapi[standard]", "python-multipart",
    )
    .env({"HF_HOME": "/cache"})
    .add_local_python_source("vision", "nutrition", "server")
)

hf_cache = modal.Volume.from_name("hf-cache", create_if_missing=True)


@app.function(
    image=image,
    gpu=["L4", "A10G", "L40S"],
    volumes={"/cache": hf_cache},
    secrets=[modal.Secret.from_name("usda")],
    scaledown_window=300,
    max_containers=1,
    timeout=600,
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    from server import app as fastapi_app
    return fastapi_app


@app.function(image=image, volumes={"/cache": hf_cache}, timeout=1800)
def download_model():
    """Run once on a cheap CPU machine: put the model files in the volume."""
    from huggingface_hub import snapshot_download
    snapshot_download("Qwen/Qwen2.5-VL-7B-Instruct")
    hf_cache.commit()
    print("Model saved to volume!")

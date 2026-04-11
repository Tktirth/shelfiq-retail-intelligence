"""
Training Utility — SKU-110K Retail Detection
This script fine-tunes a pre-trained YOLOv8 model on the SKU-110K dataset.
"""
import os
import argparse
from ultralytics import YOLO

def train_sku110k(
    model_size: str = "n", 
    epochs: int = 100, 
    imgsz: int = 640,
    batch: int = 8,
    fraction: float = 0.1
):
    """
    Train YOLOv8 on original SKU-110K dataset in smaller parts.
    
    Args:
        model_size (str): 'n' (nano), 's' (small), 'm' (medium)
        epochs (int): Number of training epochs
        imgsz (int): Image size for training
        batch (int): Batch size (kept small for stability)
        fraction (float): Fraction of dataset to use for training (for training in small parts)
    """
    model_name = f"yolov8{model_size}.pt"
    print(f"--- Starting SKU-110K Training (Fraction: {fraction*100}%) ---")
    print(f"Base Model: {model_name}")
    print(f"Epochs: {epochs}")
    print(f"Image Size: {imgsz}")
    print(f"Batch Size: {batch}")
    
    # 1. Load the pre-trained COCO model as backbone
    model = YOLO(model_name)
    
    # 2. Train on Original SKU-110K Dataset using the fraction logic for small parts
    results = model.train(
        data="SKU-110K.yaml",
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        fraction=fraction,
        name=f"yolov8{model_size}_sku110k_frac{fraction}",
        device=0 if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu"
    )
    
    print("--- Training Complete ---")
    print(f"Best weights saved to: {results.save_dir}/weights/best.pt")
    
    # 3. Rename/Link the output for the project
    output_path = "sku110k_best.pt"
    import shutil
    try:
        shutil.copy(f"{results.save_dir}/weights/best.pt", output_path)
        print(f"Final model deployed to: {output_path}")
    except Exception as e:
        print(f"Warning: Could not copy weights to root: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 on original SKU-110K retail dataset in small parts")
    parser.add_argument("--size", type=str, default="n", choices=["n", "s", "m"], help="Model size")
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image size")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--fraction", type=float, default=0.2, help="Fraction of the dataset to train on (e.g., 0.2 for 20%)")
    
    args = parser.parse_args()
    
    # Safety Check: Warn if no GPU detected
    import torch
    if not torch.cuda.is_available():
        print("WARNING: No CUDA-compatible GPU detected. Training on CPU will be EXTREMELY slow.")
        cont = input("Do you want to proceed anyway? (y/n): ")
        if cont.lower() != 'y':
            exit()
            
    train_sku110k(model_size=args.size, epochs=args.epochs, imgsz=args.imgsz)

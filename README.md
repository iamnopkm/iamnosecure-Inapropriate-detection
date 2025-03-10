# Inapropriate-content-detection
A project ultilize YOLOv8 model to detect and censor NSFW parts inside image and video

In this project i used 18 classes:
<br>
labels = [
  "FEMALE_GENITALIA_COVERED",
  "FACE_FEMALE",
  "BUTTOCKS_EXPOSED",
  "FEMALE_BREAST_EXPOSED",
  "FEMALE_GENITALIA_EXPOSED",
  "MALE_BREAST_EXPOSED",
  "ANUS_EXPOSED",
  "FEET_EXPOSED",
  "BELLY_COVERED",
  "FEET_COVERED",
  "ARMPITS_COVERED",
  "ARMPITS_EXPOSED",
  "FACE_MALE",
  "BELLY_EXPOSED",
  "MALE_GENITALIA_EXPOSED",
  "ANUS_COVERED",
  "FEMALE_BREAST_COVERED",
  "BUTTOCKS_COVERED"
];
<br>
![love](https://img.shields.io/badge/Made%20with-🖤-white)
![react](https://img.shields.io/badge/React-blue?logo=react)
![onnxruntime-web](https://img.shields.io/badge/onnxruntime--web-white?logo=onnx&logoColor=black)
![opencv.js](https://img.shields.io/badge/opencv.js-green?logo=opencv)

---

## Setup

```bash
git clone https://github.com/iamnopkm/iamnosecure-Inapropriate-detection.git
yarn install 
```

## Run Scripts

```bash
yarn start 
yarn build 
```

## Models

**Main Model**

The main model used in this project is YOLOv8n.onnx
> :warning: You can use another YOLOv8 model for this repo, however it may cause memory problems when run on your local browser.

## How to use another YOLOv8 model.

1. Export YOLOv8 model to onnx format.

   ```python
   from ultralytics import YOLO

   # Load a model
   model = YOLO("yolov8n.pt")  # load an official model

   # Export the model
   model.export(format="onnx")
   ```

2. Copy `your_custom_model.onnx` to `./public/model`
3. Update `modelName` in `App.jsx` to new model name
   ```jsx
   ...
   // configs
   const modelName = "your_custom_model.onnx"; // change to new model name
   const modelInputShape = [1, 3, 640, 640];
   const topk = 100;
   const iouThreshold = 0.4;
   const scoreThreshold = 0.2;
   ...
   ```
4. Test with your browser :3

> :warning: If you use a different classes from me then please update `src/utils/labels.json` with your custom YOLOv8 model classes.

## Credits
- Web frame work based on: https://github.com/Hyuto/yolov8-onnxruntime-web
- Some of models checkpoints i got from: https://github.com/notAI-tech/NudeNet/releases/tag/v0 
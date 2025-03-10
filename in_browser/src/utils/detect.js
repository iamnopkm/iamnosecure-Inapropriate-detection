import cv from "@techstark/opencv-js";
import { Tensor } from "onnxruntime-web";
import { renderBoxes } from "./renderBox";

export const detectImage = async (
  image,
  canvas,
  session,
  topk,
  iouThreshold,
  scoreThreshold,
  inputShape
) => {
  const [modelWidth, modelHeight] = inputShape.slice(2);
  const [input, xRatio, yRatio] = preprocessing(image, modelWidth, modelHeight);

  const tensor = new Tensor("float32", input.data32F, inputShape);
  const config = new Tensor(
    "float32",
    new Float32Array([topk, iouThreshold, scoreThreshold])
  );
  const { output0 } = await session.net.run({ images: tensor });
  const { selected } = await session.nms.run({ detection: output0, config: config });

  const boxes = [];
  const inappropriateLabels = ["BUTTOCKS_EXPOSED", "FEMALE_BREAST_EXPOSED", "FEMALE_GENITALIA_EXPOSED", "ANUS_EXPOSED", "MALE_GENITALIA_EXPOSED"];
  const detectedInappropriateLabels = new Set();

  for (let idx = 0; idx < selected.dims[1]; idx++) {
    const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]);
    const box = data.slice(0, 4);
    const scores = data.slice(4);
    const score = Math.max(...scores);
    const label = scores.indexOf(score);

    const [x, y, w, h] = [
      (box[0] - 0.5 * box[2]) * xRatio,
      (box[1] - 0.5 * box[3]) * yRatio,
      box[2] * xRatio,
      box[3] * yRatio,
    ];

    const labelName = labels[label];
    if (inappropriateLabels.includes(labelName)) {
      detectedInappropriateLabels.add(labelName);
    }

    boxes.push({
      label: label,
      probability: score,
      bounding: [x, y, w, h],
    });
  }

  renderBoxes(canvas, boxes);
  input.delete();

  let classificationResult;
  if (detectedInappropriateLabels.size > 0) {
    classificationResult = {
      safe: false,
      message: 'This image contains inappropriate content',
      labels: Array.from(detectedInappropriateLabels)
    };
  } else {
    classificationResult = {
      safe: true,
      message: 'This image is safe',
      labels: []
    };
  }

  return classificationResult;
};

export const detectVideo = (
  video,
  canvas,
  session,
  topk,
  iouThreshold,
  scoreThreshold,
  inputShape,
  callback
) => {
  const [modelWidth, modelHeight] = inputShape.slice(2);
  const ctx = canvas.getContext("2d");
  let animationId = null;
  let lastDrawTime = 0;
  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS;

  const detect = async (currentTime) => {
    if (video.paused || video.ended) {
      return;
    }

    if (currentTime - lastDrawTime < frameInterval) {
      animationId = requestAnimationFrame(detect);
      return;
    }

    lastDrawTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const [input, xRatio, yRatio] = preprocessingFromImageData(imageData, modelWidth, modelHeight);

    const tensor = new Tensor("float32", input.data32F, inputShape);
    const config = new Tensor(
      "float32",
      new Float32Array([topk, iouThreshold, scoreThreshold])
    );
    const { output0 } = await session.net.run({ images: tensor });
    const { selected } = await session.nms.run({ detection: output0, config: config });

    const boxes = [];
    const inappropriateLabels = ["BUTTOCKS_EXPOSED", "FEMALE_BREAST_EXPOSED", "FEMALE_GENITALIA_EXPOSED", "ANUS_EXPOSED", "MALE_GENITALIA_EXPOSED"];
    const detectedInappropriateLabels = new Set();

    for (let idx = 0; idx < selected.dims[1]; idx++) {
      const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]);
      const box = data.slice(0, 4);
      const scores = data.slice(4);
      const score = Math.max(...scores);
      const label = scores.indexOf(score);

      const [x, y, w, h] = [
        (box[0] - 0.5 * box[2]) * xRatio,
        (box[1] - 0.5 * box[3]) * yRatio,
        box[2] * xRatio,
        box[3] * yRatio,
      ];

      const labelName = labels[label];
      if (inappropriateLabels.includes(labelName)) {
        detectedInappropriateLabels.add(labelName);
      }

      boxes.push({
        label: label,
        probability: score,
        bounding: [x, y, w, h],
      });
    }

    renderBoxes(canvas, boxes);
    input.delete();

    let classificationResult;
    if (detectedInappropriateLabels.size > 0) {
      classificationResult = {
        safe: false,
        message: 'This video part contains inappropriate content',
        labels: Array.from(detectedInappropriateLabels)
      };
    } else {
      classificationResult = {
        safe: true,
        message: 'This video part is safe',
        labels: []
      };
    }

    callback(classificationResult);

    animationId = requestAnimationFrame(detect);
  };

  const startDetection = () => {
    animationId = requestAnimationFrame(detect);
  };

  const stopDetection = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };

  video.addEventListener('play', startDetection);
  video.addEventListener('pause', stopDetection);
  video.addEventListener('ended', stopDetection);

  return {
    stop: stopDetection
  };
};

const preprocessing = (source, modelWidth, modelHeight) => {
  const mat = cv.imread(source);
  const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3);
  cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);

  const maxSize = Math.max(matC3.rows, matC3.cols);
  const xPad = maxSize - matC3.cols,
    xRatio = maxSize / matC3.cols;
  const yPad = maxSize - matC3.rows,
    yRatio = maxSize / matC3.rows;
  const matPad = new cv.Mat();
  cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT);

  const input = cv.blobFromImage(
    matPad,
    1 / 255.0,
    new cv.Size(modelWidth, modelHeight),
    new cv.Scalar(0, 0, 0),
    true,
    false
  );

  mat.delete();
  matC3.delete();
  matPad.delete();

  return [input, xRatio, yRatio];
};

const preprocessingFromImageData = (imageData, modelWidth, modelHeight) => {
  const matData = cv.matFromImageData(imageData);
  const matC3 = new cv.Mat(matData.rows, matData.cols, cv.CV_8UC3);
  cv.cvtColor(matData, matC3, cv.COLOR_RGBA2BGR);

  const maxSize = Math.max(matC3.rows, matC3.cols);
  const xPad = maxSize - matC3.cols,
    xRatio = maxSize / matC3.cols;
  const yPad = maxSize - matC3.rows,
    yRatio = maxSize / matC3.rows;
  const matPad = new cv.Mat();
  cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT);

  const input = cv.blobFromImage(
    matPad,
    1 / 255.0,
    new cv.Size(modelWidth, modelHeight),
    new cv.Scalar(0, 0, 0),
    true,
    false
  );

  matData.delete();
  matC3.delete();
  matPad.delete();

  return [input, xRatio, yRatio];
};

const labels = [
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
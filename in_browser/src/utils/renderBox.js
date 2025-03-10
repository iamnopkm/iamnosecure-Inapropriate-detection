

//check point
import labels from "./labels.json";

const ALLOWED_LABELS = [
  "BUTTOCKS_EXPOSED",
  "FEMALE_BREAST_EXPOSED",
  "FEMALE_GENITALIA_EXPOSED",
  "ANUS_EXPOSED",
  "MALE_GENITALIA_EXPOSED"
];

export const renderBoxes = (canvas, boxes) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  // font configs
  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";

  boxes.forEach((box) => {
    const klass = labels[box.label];
    
    // Only process if the label is in the ALLOWED_LABELS array
    if (ALLOWED_LABELS.includes(klass)) {
      const score = (box.probability * 100).toFixed(1);
      const [x1, y1, width, height] = box.bounding;

      // draw box
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; //change to 0.2 to saw object, to 1 to sencor object
      ctx.fillRect(x1, y1, width, height);
      // draw border box
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
      ctx.strokeRect(x1, y1, width, height);

      // draw the label background
      ctx.fillStyle = "#000000";
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 1); // base 10
      const yText = y1 - (textHeight + ctx.lineWidth);
      ctx.fillRect(
        x1 - 1,
        yText < 0 ? 0 : yText,
        textWidth + ctx.lineWidth,
        textHeight + ctx.lineWidth
      );

      // Draw labels
      // ctx.fillStyle = "#ffffff";
      // ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 1 : yText + 1);
    }
  });
};


import React, { useState, useRef, useEffect } from "react";
import cv from "@techstark/opencv-js";
import { Tensor, InferenceSession } from "onnxruntime-web";
import Loader from "./components/loader";
import { detectImage, detectVideo } from "./utils/detect";
import { download } from "./utils/download";
import "./style/App.css";
import { FaImage, FaVideo, FaEye, FaDrawPolygon, FaPlay, FaPause } from 'react-icons/fa';
import "./logo192.png"


const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: null });
  const [media, setMedia] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeOption, setActiveOption] = useState('image');
  const [showOriginal, setShowOriginal] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeView, setActiveView] = useState('original');
  const inputRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Configs
  const modelName = "best.onnx";
  const modelInputShape = [1, 3, 320, 320];
  const topk = 100;
  const iouThreshold = 0.45;
  const scoreThreshold = 0.25;

  useEffect(() => {
    // Initialize OpenCV and load models
    cv["onRuntimeInitialized"] = async () => {
      const baseModelURL = `${process.env.PUBLIC_URL}/model`;

      // Create session
      const arrBufNet = await download(
        `${baseModelURL}/${modelName}`,
        ["Loading", setLoading]
      );
      const yolov8 = await InferenceSession.create(arrBufNet);
      const arrBufNMS = await download(
        `${baseModelURL}/nms-yolov8.onnx`,
        ["Loading NMS model", setLoading]
      );
      const nms = await InferenceSession.create(arrBufNMS);

      // Warmup main model
      setLoading({ text: "Warming up model...", progress: null });
      const tensor = new Tensor(
        "float32",
        new Float32Array(modelInputShape.reduce((a, b) => a * b)),
        modelInputShape
      );
      await yolov8.run({ images: tensor });

      setSession({ net: yolov8, nms: nms });
      setLoading(null);
    };
  }, []);

  const handleMediaDetection = async () => {
    if (activeOption === 'image') {
      const result = await detectImage(
        imageRef.current,
        canvasRef.current,
        session,
        topk,
        iouThreshold,
        scoreThreshold,
        modelInputShape
      );
      setClassificationResult(result);
    } else if (activeOption === 'video') {
      setIsVideoPlaying(true);
      setClassificationResult(null);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const videoProcessor = detectVideo(
        videoRef.current,
        canvasRef.current,
        session,
        topk,
        iouThreshold,
        scoreThreshold,
        modelInputShape,
        (result) => {
          setClassificationResult(result);
        }
      );
      videoRef.current.onended = () => {
        setIsVideoPlaying(false);
        videoProcessor.stop();
      };
    }
  };

  const toggleMediaView = (view) => {
    setShowOriginal(view === 'original');
    setActiveView(view);
    if (view === 'original') {
      canvasRef.current.style.display = 'none';
    } else {
      canvasRef.current.style.display = 'block';
      if (!classificationResult) {
        handleMediaDetection();
      }
    }
  };

  const handleFileChange = (e) => {
    if (media) {
      URL.revokeObjectURL(media);
      setMedia(null);
    }
    setClassificationResult(null);
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setMedia(url);
    setShowOriginal(true);
    setActiveView('original');

    if (activeOption === 'image') {
      imageRef.current.src = url;
      imageRef.current.onload = handleMediaDetection;
    } else if (activeOption === 'video') {
      videoRef.current.src = url;
      videoRef.current.currentTime = 0;
      setIsVideoPlaying(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarExpanded(true);
  };

  const closeSidebar = () => {
    setSidebarExpanded(false);
  };

  const handleOptionClick = (option) => {
    setActiveOption(option);
    setMedia(null);
    setClassificationResult(null);
    setActiveView('original');
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsVideoPlaying(false);
    }
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const toggleVideoPlayback = () => {
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play();
      setIsVideoPlaying(true);
      if (!showOriginal) {
        handleMediaDetection();
      }
    }
  };

  return (
    <div className={`App ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
      <div className="logo-container">
        <img 
          src="./logo192.png" 
          alt="USTH Logo" 
          className="usth-logo"
        />
      </div>
      <div 
        className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`} 
        onMouseEnter={toggleSidebar} 
        onMouseLeave={closeSidebar}
      >
        <div className="sidebar-content">
          <button 
            onClick={() => handleOptionClick('image')} 
            className={activeOption === 'image' ? 'active' : ''}
          >
            <FaImage /> <span className="button-text">Image</span>
          </button>
          <button 
            onClick={() => handleOptionClick('video')} 
            className={activeOption === 'video' ? 'active' : ''}
          >
            <FaVideo /> <span className="button-text">Video</span>
          </button>
        </div>
      </div>

      {loading && (
        <Loader>
          {loading.progress ? `${loading.text} - ${loading.progress}%` : loading.text}
        </Loader>
      )}
      <div className="header">
        <h1>Iamnosecurify: Check Inappropriate Content</h1>
      </div>

      <div className="main-content">
        <div className="content">
          {activeOption === 'image' && (
            <img
              ref={imageRef}
              src="#"
              alt=""
              style={{ display: media ? "block" : "none" }}
            />
          )}
          {activeOption === 'video' && (
            <video
              ref={videoRef}
              style={{ display: media ? "block" : "none" }}
              onPlay={() => {
                if (!showOriginal) {
                  handleMediaDetection();
                }
              }}
            />
          )}
          <canvas
            id="canvas"
            width={modelInputShape[2]}
            height={modelInputShape[3]}
            ref={canvasRef}
            style={{ display: showOriginal ? 'none' : 'block' }}
          />
        </div>
        
        {classificationResult && (
          <div className={`classification-result ${classificationResult.safe ? 'safe' : 'unsafe'}`}>
            <p>{classificationResult.message}</p>
            {!classificationResult.safe && classificationResult.labels.length > 0 && (
              <p>Detected inappropriate content: {classificationResult.labels.join(", ")}</p>
            )}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={inputRef}
        accept={activeOption === 'image' ? "image/*" : "video/*"}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div className="btn-container">
        <button onClick={() => inputRef.current.click()}>
          Open local {activeOption}
        </button>
        {media && (
          <>
            <button 
              onClick={() => toggleMediaView('original')}
              style={{ backgroundColor: activeView === 'original' ? 'red' : 'var(--primary-color)' }}
            >
              <FaEye /> Original
            </button>
            <button 
              onClick={() => toggleMediaView('detected')}
              style={{ backgroundColor: activeView === 'detected' ? 'red' : 'var(--primary-color)' }}
            >
              <FaDrawPolygon /> Detected
            </button>
            {activeOption === 'video' && (
              <button onClick={toggleVideoPlayback}>
                {isVideoPlaying ? <FaPause /> : <FaPlay />}
                {isVideoPlaying ? 'Pause' : 'Play'}
              </button>
            )}
            <button
              onClick={() => {
                inputRef.current.value = "";
                if (activeOption === 'image') {
                  imageRef.current.src = "#";
                } else {
                  videoRef.current.src = "";
                  setIsVideoPlaying(false);
                }
                URL.revokeObjectURL(media);
                setMedia(null);
                setClassificationResult(null);
                setActiveView('original');
              }}
            >
              Close {activeOption}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
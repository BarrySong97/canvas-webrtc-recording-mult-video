import { useEffect, useRef, useState } from "react";
type VideoItem = {
  id: string;
  video: HTMLVideoElement;
  isScreenShare?: boolean;
};
function App() {
  const [users, setUsers] = useState<number>(2);
  const mainStage = useRef<HTMLVideoElement>(null);
  const [screenShare, setScreenShare] = useState(false);
  const [camera, setCamera] = useState(false);
  const [_, setMichphone] = useState(false);
  const [isRecording, setisRecording] = useState(false);
  const videos = useRef<VideoItem[]>([]);

  const webrtcRecorder = useRef<MediaRecorder>();
  const recordId = useRef<number>();

  const canvasInstance = useRef<HTMLCanvasElement>(null);
  const canvasVideo = useRef<HTMLVideoElement>(null);

  const getAudioTracks = (stream: MediaStream) => {
    return stream.getAudioTracks();
  };

  const combineAudioStreams = (
    recordStream: MediaStream,
    streams?: MediaStream[]
  ) => {
    const audioStreams = streams
      ?.map((stream) => getAudioTracks(stream))
      .flat();
    audioStreams?.forEach((track) => {
      recordStream.addTrack(track);
    });
  };

  const draw = () => {
    const canvas = canvasInstance.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = 1280;
      canvas.height = 720;
      videos.current?.forEach((item, i) => {
        ctx?.save();
        if (item.isScreenShare) {
          ctx?.drawImage(item.video, 0, 200, 600, 300);
        } else {
          ctx?.translate(266 * i, 0);
          ctx?.drawImage(item.video, i * 10, 0, 266, 200);
        }
        ctx?.restore();
      });
      recordId.current = requestAnimationFrame(draw);
    }
  };

  const onPlay = (e: any) => {
    if (!recordId.current) {
      draw();
    }
  };

  // if quit, remember to cancelAnimationFrame
  const onPause = (e: any) => {
    if (recordId.current) {
      cancelAnimationFrame(recordId.current);
    }
  };

  const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onRecord = () => {
    if (!isRecording && canvasVideo.current && canvasInstance.current) {
      const canvasStream = canvasInstance.current.captureStream();
      combineAudioStreams(
        canvasStream,
        videos.current.map((item) => item.video.srcObject) as MediaStream[]
      );
      canvasVideo.current.srcObject = canvasStream;
      const recorder = new MediaRecorder(canvasStream);
      recorder.ondataavailable = function (event) {
        const blob = event.data;
        saveBlob(blob, "recorded-video.webm");
      };
      webrtcRecorder.current = recorder;
      recorder.start();
    } else {
      webrtcRecorder.current?.stop();
      if (canvasVideo.current) {
        canvasVideo.current.srcObject = null;
      }
    }

    setisRecording((isRecording) => !isRecording);
  };

  const onAddUser = () => {
    setUsers((users) => users + 1);
  };

  useEffect(() => {
    const first = videos.current?.[0];
    const last = videos.current?.[videos.current.length - 1];
    if (first && last && !last.isScreenShare) {
      last.video.srcObject = first.video.srcObject;
    }
  }, [users]);

  const onRemoveUser = (id: string) => {
    const shareVideo = videos.current.find((item) => item.isScreenShare);
    const videoTempList = videos.current.filter((item) => !item.isScreenShare);
    videoTempList.pop();
    if (shareVideo) {
      videoTempList.push(shareVideo);
    }
    videos.current = videoTempList;
    setUsers((users) => users - 1);
  };

  // just local stream, all stream is sameone for testing, in real case, it will be different
  const onMicphone = () => {
    if (canvasVideo.current) {
      const audioTrack = getAudioTracks(
        canvasVideo.current.srcObject as MediaStream
      );
      audioTrack.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setMichphone((michphone) => !michphone);
  };

  const onCamera = async () => {
    if (!camera) {
      // open camera
      const constraints = { video: true, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videos.current?.forEach((item) => {
        item.video.srcObject = stream;
        item.video.onplay = onPlay;
        // item.video.onpause = onPause;
      });
    } else {
      // close camera
    }
    setCamera((camera) => !camera);
  };
  const onScreenShare = async () => {
    if (!screenShare && mainStage.current) {
      const constraints = { video: true, audio: false };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      mainStage.current.srcObject = stream;
      videos.current.push({
        id: "screenShare",
        video: mainStage.current,
        isScreenShare: true,
      });
    } else {
      const index = videos.current.findIndex((item) => item.isScreenShare);
      videos.current.splice(index, 1);
    }
    setScreenShare((screenShare) => !screenShare);
  };

  return (
    <div className="h-full flex justify-center flex-col items-center">
      <div className="flex mb-4 text-center">
        <div className="mr-4">
          <h1 className="text-lg">canvas stream</h1>
          <video
            ref={canvasVideo}
            autoPlay
            className="bg-black  "
            style={{ height: 300 }}
          ></video>
        </div>
        <div>
          <h1 className="text-lg">Main Stage</h1>

          <video
            ref={mainStage}
            style={{ height: 300 }}
            muted
            autoPlay
            src=""
            id="stage"
            className="bg-black "
          ></video>
        </div>
      </div>
      <div className="flex mb-4">
        {Array.from({ length: users }, (_, i) => (
          <div className="text-center">
            <video
              ref={(video) => {
                if (
                  video &&
                  !videos.current.find((item) => item.id === i.toString())
                ) {
                  videos.current?.push({ id: i.toString(), video });
                }
              }}
              style={{ height: "200px" }}
              autoPlay
              muted
              src=""
              key={i}
              className="bg-black mr-4 object-cover cursor-pointer"
            ></video>
            <h1>user {i}</h1>
          </div>
        ))}
      </div>

      <div>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onRecord}
        >
          record
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onRecord}
        >
          stop
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onCamera}
        >
          camera
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onMicphone}
        >
          micphone
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onAddUser}
        >
          addUser
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onRemoveUser}
        >
          removeUser
        </button>
        <button
          className="pointer-events-auto ml-8 rounded-md bg-indigo-600 py-2 px-3 text-[0.8125rem] font-semibold leading-5 text-white hover:bg-indigo-500"
          onClick={onScreenShare}
        >
          screenShare
        </button>
      </div>
      <div>
        -----------------------------------------------------------------
      </div>
      <div className="text-center">
        <h1 className="text-lg bold">canvas</h1>

        <div>
          <canvas style={{ background: "green" }} ref={canvasInstance}></canvas>
        </div>
      </div>
    </div>
  );
}

export default App;

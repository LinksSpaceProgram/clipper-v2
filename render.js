console.log("Render")


window.api.createProgressUpdater();
window.api.addFileSelectEventListener(async () => {

    //console.log('File Select button clicked');

    const filePath = await window.api.openFileDialog();
    //Get the button elements and put them in a list to make it easier to change their classes
    const fileSelectButton = document.getElementById('fileSelectButton');
    const fileSelectButtonText = document.getElementById('fileSelectButtonText');
    const spinnerSpan = document.getElementById('spinner');
    const loadingBar = document.getElementById('loading-bar')
    let elements = [fileSelectButton, fileSelectButtonText];

    if (filePath.length > 0) {

        elements.forEach(element => {

            element.classList.replace("noFileSelected", "loading");
            element.classList.replace("fileSelected", "loading");

        })
        
        fileSelectButton.disabled = true;
        spinnerSpan.style.display = 'inline-block';
        loadingBar.style.display = 'block';
        fileSelectButtonText.textContent = '';

        let video = await window.api.getVideo(filePath[0]);
        await new Promise(resolve => setTimeout(resolve, 500)); //Give the loading bar a chance to finish its animation
        elements.forEach(element => {element.classList.replace("loading", "fileSelected")});

        fileSelectButton.disabled = false;
        loadingBar.style.display = 'none';
        spinnerSpan.style.display = 'none';
        fileSelectButtonText.textContent = "✔";

        console.log('Selected file:', filePath[0]);

        enableVideoControls(video);

    } else {

        elements.forEach(element => {

            element.classList.replace("loading", "noFileSelected");
            element.classList.replace("fileSelected", "noFileSelected");

        });

        fileSelectButton.disabled = false;
        spinnerSpan.style.display = 'none';
        loadingBar.style.display = 'none';
        fileSelectButtonText.textContent = "✖";
        
        console.log('No file selected');

    }

});

function enableVideoControls(video) {

    //Definitions of all relevant elements
    const startSlider = document.getElementById('start-slider');        //The left slider
    const endSlider = document.getElementById('end-slider');     //The right slider
    const startTimecode = document.getElementById('start-timecode');     //Timecode of the start (this should always be 00:00 I think)
    const endTimecode = document.getElementById('end-timecode');     //The duration of the video
    const videoPreview = document.getElementById('video-timeline');      //The timeline video
    const currentFrame = document.getElementById('current-frame');      //Current frame preview
    let isDraggingStart = false;    //Is the user dragging the start slider?
    let isDraggingEnd = false;      //Is the user dragging the end bar?
    let videoDuration = Math.floor(video.streams[0].duration) - 1;      //Rounded down and -1'd because we don't have a frame for the last second of the video

    console.log(videoDuration)

    //Helper function to format timecode
    const formatTimecode = (timeInSeconds) => {

        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;

    };

    //Update the current frame preview
    const updateCurrentFrame = (time) => {
        
        //TODO Get the frame from the /frames folder
        //currentFrame.innerText = `Frame at ${Math.floor(time)}`;
        let paddedNumber = String(Math.floor(time) + 1).padStart(8, '0'); //Match the frames generated in  main. +1 because fluent-ffmpeg starts from 1. Yeah..
        let frameFilename = `frame-${paddedNumber}.png`;
        let framePath = (window.api.getFramePath(frameFilename));
        //console.log("Seeking " + framePath)
        currentFrame.style.backgroundImage = `url(${framePath})`;

    };

    //Load the frame at 0 so that the container isn't empty
    updateCurrentFrame(0);

    //Update the end timecode so that it doesn't show 00:00 until the user interacts with the end slider
    endTimecode.innerText = formatTimecode(Math.floor(videoDuration));

    //Add event listeners for dragging sliders
    startSlider.addEventListener('mousedown', () => isDraggingStart = true);
    endSlider.addEventListener('mousedown', () => isDraggingEnd = true);

    document.addEventListener('mouseup', () => {
        isDraggingStart = false;
        isDraggingEnd = false;
    });

    //Magic
    document.addEventListener('mousemove', (e) => {

        // Get the size of the timeline 
        const containerRect = videoPreview.getBoundingClientRect();
        const containerWidth = containerRect.width - 5; //-5 to account for width of the slider
        const pixelsPerSecond = containerWidth / videoDuration;

        if (isDraggingStart) {

            let newLeft = Math.max(0, Math.min(e.clientX - containerRect.left, containerWidth));
            newLeft = Math.floor(newLeft / pixelsPerSecond) * pixelsPerSecond; // Snap to nearest second

            if (newLeft > parseFloat(endSlider.style.left) - startSlider.clientWidth) {
                newLeft = parseFloat(endSlider.style.left) - startSlider.clientWidth;
            }

            startSlider.style.left = `${newLeft}px`;
            const startTime = Math.round(((newLeft / containerWidth) * videoDuration));
            startTimecode.innerText = formatTimecode(Math.floor(startTime));
            updateCurrentFrame(Math.floor(startTime));
            //console.log("Start time: " + Math.floor(startTime));

        }

        if (isDraggingEnd) {

            let newRight = Math.max(0, Math.min(containerWidth - (e.clientX - containerRect.left), containerWidth));
            newRight = Math.floor(newRight / pixelsPerSecond) * pixelsPerSecond; // Snap to nearest second

            if (newRight > containerWidth - parseFloat(startSlider.style.left) - endSlider.clientWidth) {
                newRight = containerWidth - parseFloat(startSlider.style.left) - endSlider.clientWidth;
            }

            endSlider.style.left = `${containerWidth - newRight}px`;
            const endTime = Math.round(((containerWidth - newRight) / containerWidth) * videoDuration);
            endTimecode.innerText = formatTimecode(Math.floor(endTime));
            updateCurrentFrame(Math.floor(endTime));
        }
    });

}
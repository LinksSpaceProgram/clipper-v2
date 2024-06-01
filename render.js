window.api.createProgressUpdater();
window.api.addFileSelectEventListener(async () => {

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
        addTextAreaHandlers();

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

//Definitions of all relevant elements
const startSlider = document.getElementById('start-slider');        //The left slider
const endSlider = document.getElementById('end-slider');     //The right slider
const startTimecode = document.getElementById('start-timecode');     //Timecode of the start (this should always be 00:00 I think)
const endTimecode = document.getElementById('end-timecode');     //The duration of the video
const videoPreview = document.getElementById('video-timeline');      //The timeline video
const currentFrame = document.getElementById('current-frame');      //Current frame preview
let isDraggingStart = false;    //Is the user dragging the start slider?
let isDraggingEnd = false;      //Is the user dragging the end bar?

let updateSlider;

function enableVideoControls(video) {

    let videoDuration = Math.floor(video.streams[0].duration) - 1;      //Rounded down and -1'd because we don't have a frame for the last second of the video

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
        const containerWidth = containerRect.width - 5; // -5 to account for width of the slider
        const pixelsPerSecond = containerWidth / videoDuration; // For slider-clipping purposes, find out how many pixels there are per second of video
    
        // Function to update the slider position
        updateSlider = (slider, otherSlider, timecodeElem, setTimecode = null) => {
            let newPos;

            if (setTimecode !== null) {

                // Calculate position based on the given time in seconds
                newPos = setTimecode * pixelsPerSecond;
                newPos = Math.min(newPos, containerWidth); // Ensure the position is within the container

            } else {

                // Calculate position based on the mouse event
                newPos = Math.max(0, Math.min(e.clientX - containerRect.left, containerWidth));
                newPos = Math.floor(newPos / pixelsPerSecond) * pixelsPerSecond; // Snap to the nearest second

            }
    
            if (slider === startSlider) {

                if (newPos > containerWidth - parseFloat(otherSlider.style.right) - slider.clientWidth) {
                    newPos = containerWidth - parseFloat(otherSlider.style.right) - slider.clientWidth;
                }

                slider.style.left = `${newPos}px`;

            } else if (slider === endSlider) {

                newPos = containerWidth - newPos;
                if (newPos > containerWidth - parseFloat(otherSlider.style.left) - slider.clientWidth) {
                    newPos = containerWidth - parseFloat(otherSlider.style.left) - slider.clientWidth;
                }

                slider.style.right = `${newPos}px`;

            }
            

    
            const time = slider === startSlider ?
                Math.round((newPos / containerWidth) * videoDuration) :
                Math.round((1 - (newPos / containerWidth)) * videoDuration);
    
            const displayedTimeCode = formatTimecode(Math.floor(time));
            timecodeElem.innerText = displayedTimeCode;
            timecodeElem.value = displayedTimeCode;
    
            updateCurrentFrame(Math.floor(time));
        };
    
        if (isDraggingStart) { updateSlider(startSlider, endSlider, startTimecode); }
    
        if (isDraggingEnd) { updateSlider(endSlider, startSlider, endTimecode); }

    });

}

//Function to set slider by time in seconds
const setSliderByTime = (slider, timeInSeconds, timecodeElem) => {

    let otherSlider;
    if (slider === startSlider) { otherSlider = endSlider; } 
    else { otherSlider = startSlider; }
    updateSlider(slider, otherSlider, timecodeElem, timeInSeconds);

};

//This function adds the input handling and validation to the timecode textareas
function addTextAreaHandlers() {

    const handleInput = (e) => {
        
        //Definitions
        //e is the event that is sent by the listener
        let input = e.srcElement.value; 
        const timecodeRegex = /^([0-5]?\d):([0-5]?\d)$/;
        const wholeNumberRegex = /^\d+$/;
        let totalSeconds;

        if (timecodeRegex.test(input)) {

            //Calculate the value in seconds that the user has entered, if it fits the mm:ss format
            const match = input.match(timecodeRegex);
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            totalSeconds = minutes * 60 + seconds;

            //Send to our helper function for formatting
            output = formatTimecode(totalSeconds);

        } else if (wholeNumberRegex.test(input)) {

            //If the user has just entered a number, check that it's a whole number and send it off to the helper function for formatting
            totalSeconds = parseInt(input, 10);
            output = formatTimecode(totalSeconds);

        } else {

            //The user has entered something weird since neither of the RegEx's passed, so we set the output to empty
            output = "";

        }

        if (e.srcElement.id === 'start-timecode') { setSliderByTime(startSlider, totalSeconds, e.srcElement); } 
        else { setSliderByTime(endSlider, totalSeconds, e.srcElement); }

    }

    //Helper function that formats whatever input we get into a proper mm:ss time code
    const formatTimecode = (totalSeconds) => {

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    }

    let textareas = document.getElementsByClassName("timecode");
    for (let element of textareas) {

        //Add event listeners for the user clicking out or hitting the enter key
        element.addEventListener('focusout', (e) => { handleInput(e); })
        element.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleInput(e); }})

    }

}
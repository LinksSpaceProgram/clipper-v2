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
        const pixelsPerSecond = containerWidth / videoDuration; //For slider-clipping purposes, find out how many pixels there are per second of video
        let displayedTimeCode;  //Variable that holds the timecode which will be displayed in either of the textareas

        //I am too lazy to respect DRY and this works so I'm not touching it
        if (isDraggingStart) {
            
            //Find out where the cursor is supposed to go, and make sure it doesn't leave the container box
            let newLeft = Math.max(0, Math.min(e.clientX - containerRect.left, containerWidth));
            newLeft = Math.floor(newLeft / pixelsPerSecond) * pixelsPerSecond; // Snap to the nearest second

            //Make sure the left (start) slider can never go further right than the right (end) slider
            if (newLeft > parseFloat(endSlider.style.left) - startSlider.clientWidth) { newLeft = parseFloat(endSlider.style.left) - startSlider.clientWidth; }

            //Adjust the position of the slider based on the left attribute
            startSlider.style.left = `${newLeft}px`;

            //Figure out what time our slider position corresponds to
            const startTime = Math.round(((newLeft / containerWidth) * videoDuration));
            //Get the timecode we're supposed to be displaying
            displayedTimeCode = formatTimecode(Math.floor(startTime))
            startTimecode.innerText = displayedTimeCode;
            startTimecode.value = displayedTimeCode;
            //Update the thumbnail in the preview container
            updateCurrentFrame(Math.floor(startTime));

        }

        if (isDraggingEnd) {

            //Find out where the cursor is supposed to go, and make sure it doesn't leave the container box
            let newRight = Math.max(0, Math.min(containerWidth - (e.clientX - containerRect.left), containerWidth));
            newRight = Math.floor(newRight / pixelsPerSecond) * pixelsPerSecond; // Snap to nearest second
            
            //Make sure the right (end) slider can never go further left than the left (start) slider
            if (newRight > containerWidth - parseFloat(startSlider.style.left) - endSlider.clientWidth) { newRight = containerWidth - parseFloat(startSlider.style.left) - endSlider.clientWidth;}
            
            //Figure out what time our slider position corresponds to
            endSlider.style.left = `${containerWidth - newRight}px`;
            const endTime = Math.round(((containerWidth - newRight) / containerWidth) * videoDuration);
            //Get the timecode we're supposed to be displaying
            displayedTimeCode = formatTimecode(Math.floor(endTime));
            endTimecode.innerText = displayedTimeCode;
            endTimecode.value = displayedTimeCode;
            //Update the thumbnail in the preview container
            updateCurrentFrame(Math.floor(endTime));
        }
    });

}

//This function adds the input handling and validation to the timecode textareas
function addTextAreaHandlers() {

    const handleInput = (e) => {
        
        //Definitions
        //e is the event that is sent by the listener
        let input = e.srcElement.value; 
        const timecodeRegex = /^([0-5]?\d):([0-5]?\d)$/;
        const wholeNumberRegex = /^\d+$/;

        if (timecodeRegex.test(input)) {

            //Calculate the value in seconds that the user has entered, if it fits the mm:ss format
            const match = input.match(timecodeRegex);
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const totalSeconds = minutes * 60 + seconds;
            //Send to our helper function for formatting
            output = formatTimecode(totalSeconds);

        } else if (wholeNumberRegex.test(input)) {

            //If the user has just entered a number, check that it's a whole number and send it off to the helper function for formatting
            const totalSeconds = parseInt(input, 10);
            output = formatTimecode(totalSeconds);

        } else {

            //The user has entered something weird since neither of the RegEx's passed, so we set the output to empty
            output = "";

        }
        
        //TODO: Input validation of video length
        //TODO: Input validation of overlapping times (start>end, end<start) 
        //TODO: Move sliders depending on entered value

        e.srcElement.value = output;        //The actual value of the element is stored here...
        e.srcElement.innerText = output;    //But this is the visual representation.

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
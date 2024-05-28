console.log("Render")


window.api.createProgressUpdater();
window.api.addFileSelectEventListener(async () => {

    console.log('File Select button clicked');

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
        elements.forEach(element => {element.classList.replace("loading", "fileSelected")});

        fileSelectButton.disabled = false;
        loadingBar.style.display = 'none';
        spinnerSpan.style.display = 'none';
        fileSelectButtonText.textContent = "✔";

        console.log('Selected file:', filePath[0]);

    } else {

        elements.forEach(element => {

            element.classList.replace("loading", "noFileSelected");
            element.classList.replace("fileSelected", "noFileSelected");

        });

        fileSelectButton.disabled = true;
        spinnerSpan.style.display = 'inline-block';
        loadingBar.style.display = 'block';
        fileSelectButtonText.textContent = "✖";
        
        console.log('No file selected');

    }

});

function showLoadingCircle() {



}

function hideLoadingCircle() {

    

}
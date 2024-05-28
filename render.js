console.log("Render")

window.api.addFileSelectEventListener(async () => {

    console.log('File Select button clicked');

    const filePath = await window.api.openFileDialog();

    if (filePath.length > 0) {

        document.getElementById('fileSelectButton').classList.replace("noFileSelected", "fileSelected");
        document.getElementById('fileSelectButton').textContent = "✔";
        console.log('Selected file:', filePath[0]);

    } else {

        document.getElementById('fileSelectButton').classList.replace("fileSelected", "noFileSelected");
        document.getElementById('fileSelectButton').textContent = "✖";
        console.log('No file selected');

    }

});
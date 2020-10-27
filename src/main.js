/*
	main.js is primarily responsible for hooking up the UI to the rest of the application 
	and setting up the main event loop
*/

// We will write the functions in this file in the traditional ES5 way
// In this instance, we feel the code is more readable if written this way
// If you want to re-write these as ES6 arrow functions, to be consistent with the other files, go ahead!

import * as utils from './utils.js';
import * as audio from './audio.js';
import * as canvas from './canvas.js';
import * as lib from "./lepLIB.js";

// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
	sound1  :  "media/new-adventure.mp3"
});

let drawParams = {
	showEmboss: false,
	showInvert: false,
	//showCauldron: true,
	showFlowers: true,
	showPotion: true,
	showNotes: true,
	showClouds: true,
	colorHighlight: "none",
	numBits: 5
};

let audioElement;
let progressIndicator;

function init(){
	console.log("init called");
	console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
	audio.setupWebaudio(DEFAULTS.sound1);
	let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
	audioElement = document.querySelector("audio");
	progressIndicator = document.querySelector("#progressIndicator");

	setupUI(canvasElement);
	canvas.setupCanvas(canvasElement, audio.analyserNode);
	loop();
}

function setupUI(canvasElement){
	const fsButton = document.querySelector("#fsButton");
	let invertCB = document.querySelector("#invertCB");
	let embossCB = document.querySelector("#embossCB");
	//let cauldronCB = document.querySelector("#cauldronCB");
	let flowersCB = document.querySelector("#flowersCB");
	let potionCB = document.querySelector("#potionCB");
	let notesCB = document.querySelector("#notesCB");
	let cloudsCB = document.querySelector("#cloudsCB");
	let highlightDD = document.querySelector("#highlightDD");
	let bitsRange = document.querySelector("#bits");
	let audioFilter = document.querySelectorAll("input[type='radio'][name='distortionRB']");
	let dropbox = document.querySelector("#dropbox");
	
	
  	// add .onclick event to button
	fsButton.onclick = e => {
		console.log("init called");
		utils.goFullscreen(canvasElement);
	};
	
	playButton.onclick = e => {
		console.log(`audioCtx.state before = ${audio.audioCtx.state}`);
		if(audio.audioCtx.state == "suspended") {
			audio.audioCtx.resume();
		}
		
		console.log(`audioCtx.state after = ${audio.audioCtx.state}`);

		if(e.target.dataset.playing == "no") {
			audio.playCurrentSound();
			e.target.dataset.playing = "yes";
		}
		else {
			audio.pauseCurrentSound();
			e.target.dataset.playing = "no";
		}
	};
	
	
	let volumeSlider = document.querySelector("#volumeSlider");
	let volumelabel = document.querySelector("#volumeLabel");
	
	volumeSlider.oninput = e => {
		audio.setVolume(e.target.value);
		volumeLabel.innerHTML = Math.round(e.target.value/2 * 100);
	}
	
	volumeSlider.dispatchEvent(new Event("input"));
	
	//hook up track select
	let trackSelect = document.querySelector("#trackSelect");

	
	//adds onchange event to select
	trackSelect.onchange = e => {
		audio.loadSoundFile(e.target.value);
		progressIndicator.setAttribute("max", audio.getDuration());
		
		//pause current track
		if(playButton.dataset.playing = "yes") {
			playButton.dispatchEvent(new MouseEvent("click"));
		}
	}
	trackSelect.dispatchEvent(new Event("change"));
	
	//skips the part where chrome opens it in another tab
	dropbox.ondragover = e => {
		e.target.innerHTML = "drop here!";
		e.preventDefault();
	}
	
	//when a song is dropped into the drop box, load it.
	dropbox.ondrop = e => {
		e.preventDefault();

		//makes sure the file is a valid sound file type
		if(!e.dataTransfer.files[0].type.includes("audio")) {
			e.target.innerHTML = "Not a sound file!";
			return;
		}
		
		let reader = new FileReader();
		
		//when the file is read, the file is loaded into the audio element
		reader.onload = e => {
			audio.loadSoundFile(reader.result);
		}
		
		//reads the file
		reader.readAsDataURL(e.dataTransfer.files[0]);
		
		//shows name of song file
		e.target.innerHTML = e.dataTransfer.files[0].name;
		
		//progress bar reflects song length
		progressIndicator.setAttribute("max", audio.getDuration());
		
		//pause current track
		if(playButton.dataset.playing = "yes") {
			playButton.dispatchEvent(new MouseEvent("click"));
		}
	}
	
	//hook up visual effects to their ui elements
	invertCB.onchange = e => {
		drawParams.showInvert = e.target.checked;
	}
	embossCB.onchange = e => {
		drawParams.showEmboss = e.target.checked;
	}
	bitsRange.onchange = e => {
		console.log("change bits");
		drawParams.numBits = parseInt(e.target.value);
	}
	for(let filter of audioFilter) {
		filter.onclick = e => {
			if(e.target.checked)	
				audio.setFilter(e.target.value);
		}
	}

	//allow enabling/disabling of various parts of the scene
	flowersCB.onchange = e => {
		drawParams.showFlowers = e.target.checked;
	}
	potionCB.onchange = e => {
		drawParams.showPotion = e.target.checked;
	}
	notesCB.onchange = e => {
		drawParams.showNotes = e.target.checked;
	}
	cloudsCB.onchange = e => {
		drawParams.showClouds = e.target.checked;
	}
	highlightDD.onchange = e => {
		drawParams.colorHighlight = e.target.value;
	}
	
	//progress bar seeks through the song
	progressIndicator.onchange = e => {
		audio.setProgress(parseInt(e.target.value));
	}
	
	//makes progress bar reflect progress thru song
	audio.element.ontimeupdate = e => {
		progressIndicator.value = audio.getProgress();
	}
	
	//displays all of the info about the song (i.e. song duration) once the song has been loaded.
	audio.element.oncanplay = e => {
		let durMinutes = Math.floor(audio.getDuration()/60);
		let durSeconds = Math.floor(audio.getDuration() - durMinutes*60);
		progressIndicator.nextElementSibling.innerHTML = `${durMinutes}:${durSeconds}`;
		progressIndicator.setAttribute("max", audio.getDuration());
	}
	
} // end setupUI

function loop(){
	//draws the canvas stuff
	requestAnimationFrame(loop);
	canvas.draw(drawParams);
	
	//seperates song completion into minutes and seconds so it looks pretty in the ui
	let minutes = Math.floor(audio.getProgress()/60);
	let seconds = Math.floor(audio.getProgress() - minutes*60);
		
	//puts the minutes and seconds into the ui
	progressIndicator.previousElementSibling.innerHTML = `${minutes}:${seconds}`;

}




export {init};
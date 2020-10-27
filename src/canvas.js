/*
	The purpose of this file is to take in the analyser node and a <canvas> element: 
	  - the module will create a drawing context that points at the <canvas> 
	  - it will store the reference to the analyser node
	  - in draw(), it will loop through the data in the analyser node
	  - and then draw something representative on the canvas
	  - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';
import * as lib from './lepLIB.js';

let ctx,canvasWidth,canvasHeight,gradient,analyserNode,audioData,waveData;
let colorstops = [];
let startTheta = 0;
let spinSpeed = .1;
let largest = 0;
let clouds = [];
let cloudsY = [];
let bubbles = [];
let bubbleSizes = [];

//let songAverages;// = new Uint8Array();
//let songAvgsSquared;// = new Uint8Array();
//songAverages.fill(255/2);
//let tick = 0;
let sampleSize;
//var playing = false;
let cloudImg = document.querySelector("#cloud");
let sceneImg = document.querySelector("#scene");
let swirlImg = document.querySelector("#swirl");
let cauldronImg = document.querySelector("#cauldron");
let noteimg = document.querySelector("#note");

let pixelWidth;
let pixelHeight;

function setupCanvas(canvasElement,analyserNodeRef){
	// create drawing context
	ctx = canvasElement.getContext("2d");
	canvasWidth = canvasElement.width;
	canvasHeight = canvasElement.height;
	
	pixelWidth = canvasWidth/64;
	pixelHeight = canvasHeight/64;
	
	// keep a reference to the analyser node
	analyserNode = analyserNodeRef;
	
	// this is the array where the analyser data will be stored
	audioData = new Uint8Array(analyserNodeRef.fftSize/2);
	waveData = new Uint8Array(analyserNodeRef.fftSize/2);
	//songAverages = new Array(analyserNodeRef.fftSize/2);
	//songAvgsSquared = new Array(analyserNodeRef.fftSize/2);
	//songAverages.fill(0);//255/2);
	//songAvgsSquared.fill(0);//255/2) * (255/2));
	sampleSize = analyserNodeRef.fftSize/2;
	
	// create a gradient that runs top to bottom

	gradient = utils.getLinearGradient(ctx,0,0,0,canvasHeight,[{percent: 0, color: "black"}, {percent: 1, color: "rgb(63,63,116)"}]);//[{percent:0,color:"blue"},{percent:.25,color:"green"},{percent:.5,color:"yellow"},{percent:.75,color:"red"},{percent:1,color:"magenta"}]);
}

function draw(params={}){
  // 1 - populate the audioData array with the frequency data from the analyserNode
	// notice these arrays are passed "by reference" 
	analyserNode.getByteFrequencyData(audioData);
	// OR
	analyserNode.getByteTimeDomainData(waveData); // waveform data
	let avgAudioData = lepLIB.averageIntArray(audioData);

	
	
	
	
	// 2 - draw background
	ctx.save();
	ctx.fillStyle = "black";

	ctx.globalAlpha = .1;
	
	//avoids sad flickery stuff 
	if(params.showInvert == params.showGradient || !params.showGradient && params.showInvert || params.showEmboss) {
		ctx.globalAlpha = 1;
	}

	ctx.fillRect(0,0,canvasWidth, canvasHeight);
	ctx.restore();

	//draws the cauldron stuff
	
	//add background
	ctx.save();
	ctx.fillStyle = gradient;//"rgb(63,63,116)";
	ctx.beginPath();
	ctx.rect(0,0, canvasWidth, canvasHeight);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	ctx.save();
	ctx.imageSmoothingEnabled = false;

	//add clouds
	if(params.showClouds){
		let waveCount = 0;
		let startX = 0;
		for(let i = 0; i < waveData.length; i++) {
			if(waveData[i] > 127.5)
				waveCount++;
		}
		if(waveCount > 0 && Math.random() > .9) {
			//create the cloud at somewhere in (40,40) to (40, 72)
			clouds.push(0);
			cloudsY.push((24 - (waveCount/waveData.length * 20 + 4))*pixelHeight);
		}

		for(let i = 0; i < clouds.length; i++) {

			if(clouds >= startX + 32 * pixelHeight) {
				clouds.splice(i);
				cloudsY.splice(i);
			}

			ctx.drawImage(cloudImg, startX + clouds[i], cloudsY[i], cloudImg.width/4 * pixelWidth, cloudImg.height/4 *pixelHeight);
			clouds[i] ++;
		}
	}
	//add scene
	ctx.drawImage(sceneImg, 0, 0, canvasWidth, canvasHeight);

	//draws the flowers
	if(params.showFlowers) {
		for(let i = 0; i < 12; i++) {
			//do phyllotaxis

			//puts correct flowers in correct pots.
			let x = (6.5 + 9 * (i%4)) * pixelWidth + 5;

			//orders flowers correctly within pots 
			//(should be B-A-C where A is the first(biggest) flower and C is the last (smallest))
			//eventual flower positions should be EAI FBJ GCK HDL where A is the first 8 values of 
			//audio data and B is the second 8 values... etc
			if(i >= 8)
				x += 3 * pixelWidth;
			else if (i >= 4)
				x -= 3 * pixelWidth;

			//flower height is relative to volume of that section of audiodata
			let y = (24-audioData[(i) * 8]/255 * 10) * pixelHeight;

			//maxN, dotsize, dotspacing, and dotdensity are relative to the avg loudness of the audiodata 
			let maxN = audioData[i]/255 * 30;
			let dotSize = audioData[i+2]/255 * 2 + .5;
			let dotSpacing = audioData[i+1]/255 * 8;
			let dotDensity = audioData[i+3]/255 * .2;

			let divergence = 137.5;
			//hue changes with which section of audiodata the flower represents.
			let h = (i*8)/audioData.length * 255;
			let s = 75;
			let l = 50;
			let a = 1;
			let points = lepLIB.drawPhyllotaxis(ctx, x, y, maxN, dotSpacing, dotSize, dotSize, dotDensity, divergence,h,s,l,a, true, false);

			//draws the stems using bezier curves
			ctx.save();
			ctx.strokeStyle = "green";
			ctx.lineWidth = 5;
			ctx.beginPath()
			let startY = 31 * pixelHeight;
			for(let j = 1; j < waveData.length; j++) {
				//stem displays waveform data
				let a = (waveData[j-1] - 255/2)/255 * 50;
				let b = (waveData[j] - 255/2)/255 * 50;

				let ptA = {x: x+a, y: startY - ((j-1)/waveData.length * (startY - y))};
				let ptB = {x: x+b, y: startY - ((j)/waveData.length * (startY - y)) };

				ctx.quadraticCurveTo(ptA.x, ptA.y,
									 (ptA.x + ptB.x)/2, (ptA.y+ptB.y)/2);
			}
			//don't want to closepath, because otherwise it makes a yucky line
			//ctx.closePath();
			ctx.stroke();
			ctx.restore();

			//do bezier of waveform for the stem, height should be corresponding section's loudness
			ctx.save();
			ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`;
			ctx.lineWidth = dotSize;//2.5;
			ctx.beginPath();
			ctx.moveTo(x, y);
			for(let j = 1; j < points.length - 1; j++) {
				let prevpt = points[j-1];
				let pt = points[j];

				ctx.quadraticCurveTo(prevpt.x, prevpt.y,
								 (pt.x + prevpt.x)/2, (pt.y + prevpt.y)/2);
			}
			//again, not closing the path because of the yucky line
			//ctx.closePath();
			ctx.stroke();
			ctx.restore();

		}
	}

	//add cauldronswirl
	ctx.drawImage(swirlImg,0,0,canvasWidth,canvasHeight);
	if(params.showPotion) {
		//draws a transparent colored square over the potion to simulate colorizing it
		//square color depends on avg audio sound and ranges between green and blue
		ctx.save();
		ctx.fillStyle = `hsl(${avgAudioData/255 * 240+120}, ${avgAudioData/255 * 50 + 50}%, ${avgAudioData/255*50 + 50}%)`;
		ctx.globalAlpha=.5;
		ctx.beginPath();
		ctx.rect(13 * pixelWidth,47 * pixelHeight,40 * pixelWidth,9*pixelHeight);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	//add cauldron
	ctx.drawImage(cauldronImg, 0,0, canvasWidth, canvasHeight);

	//draws the notes. this in combination with the clouds and image data is what causes hitches in the visuals
	if(params.showNotes){
		//add bubbles (13, 47) -> (52,51) pixel positions
		if(Math.random() < .1 && avgAudioData > 0){

			bubbles.push({x:(Math.random() * 39 + 13) * pixelWidth, y: (Math.random() * 4 + 47) * pixelHeight});
			bubbleSizes.push(avgAudioData/255 * pixelHeight * 20 + 5);//Math.random() * pixelHeight*2 + 10);
		}

		//moves the bubbles up over time.
		for(let i = 0; i < bubbles.length; i++) {
			ctx.save();
			ctx.globalAlpha = bubbles[i].y/canvasHeight;
			ctx.drawImage(note, bubbles[i].x, bubbles[i].y, bubbleSizes[i], bubbleSizes[i]);
			ctx.restore();
			bubbles[i].y -= avgAudioData/255 * 2 + 1;//bubbleSizes[i]/(pixelHeight*2 + 10);
			if(bubbles[i].y < 0) {
				bubbles.splice(i,1);
				bubbleSizes.splice(i,1);
			}
		}
	}

	ctx.restore();

	
	//doing this every single time causes weird hitches/lagging in the visuals.
	if(params.showNoise || params.showInvert || params.showEmboss || params.colorHighlight != "none" || params.numBits < 100) {
		let imageData = ctx.getImageData(0,0,canvasWidth, canvasHeight);
		let data = imageData.data;
		let length = data.length;
		let width = imageData.width;
		// B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
		let i;
		for(i = 0; i < length; i += 4){
			
			//inverts the canvas' colors
			if(params.showInvert) {
				let red = data[i], green = data[i+1], blue = data[i+2];
				data[i] = 255-red;
				data[i + 1] = 255-green;
				data[i + 2] = 255 - blue;
			}
			//filters the image to be all red, blue, or green.
			if(params.colorHighlight != "none") {
				if(params.colorHighlight == "grayscale") {
					data[i] = data[i+1] = data[i+2] = (data[i] + data[i+1] + data[i+2])/3;
				}else {
					data[i] = (params.colorHighlight == "red"? data[i]:0);
					data[i+1] = (params.colorHighlight == "green"? data[i+1]:0);
					data[i+2] = (params.colorHighlight == "blue"? data[i+2]:0);
				}
			}
			//filters the image to look like it has a lower color bit value
			if(params.numBits < 100){
				data[i] = Math.round((data[i]+1)/255 * params.numBits)/params.numBits * 255;
				data[i+1] = Math.round((data[i+1]+1)/255 * params.numBits)/params.numBits * 255;
				data[i+2] = Math.round((data[i+2]+1)/255 * params.numBits)/params.numBits * 255;				
			}
		} // end for

		//makes the image look etched
		if(params.showEmboss) {
			let i;
			for(i = 0; i < length; i++) {
				if(i%4 == 3) continue;
				data[i] = 127 + 2*data[i] - data[i+4] - data[i + width*4];
			}
		}
		
		// D) copy image data back to canvas
		ctx.putImageData(imageData, 0, 0);	
	}
}

export {setupCanvas,draw};
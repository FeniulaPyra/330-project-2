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
var playing = false;
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

	gradient = utils.getLinearGradient(ctx,0,0,0,canvasHeight,[{percent: .3, color: "black"}, {percent:.5, color:"darkblue"} ,{percent: .7, color: "black"}]);//[{percent:0,color:"blue"},{percent:.25,color:"green"},{percent:.5,color:"yellow"},{percent:.75,color:"red"},{percent:1,color:"magenta"}]);
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
		
	
	// 3 - draw gradient
	if(params.showGradient) {

		ctx.save();
		ctx.fillStyle = gradient;
		ctx.globalAlpha = .3;//params.emboss ? 1 : .3;
		ctx.fillRect(0,0,canvasWidth, canvasHeight);
		ctx.restore();
	}
	
	// 4 - draw bars
	if(params.showBars) {
		
		let barSpacing = 4;
		let margin = 5;
		let screenWidthForBars = canvasWidth - (audioData.length * barSpacing) - margin * 2;
		let barWidth = screenWidthForBars/audioData.length;
		let barHeight = 200;
		let topSpacing = 100;
		
		ctx.save();
		for(let i = 0; i < audioData.length; i++) {
			ctx.fillStyle = `rgba(0,255,${lepLIB.averageIntArray(waveData)},${(audioData[i]+7)/255})`;
			ctx.strokeStyle = `rgba(0,255,${lepLIB.averageIntArray(waveData)},${(audioData[i]+7)/255})`;
			ctx.fillRect(
				margin + i * (barWidth + barSpacing),
				topSpacing + 256 - audioData[i],
				barWidth,
				barHeight
			);
			ctx.strokeRect(
				margin + i * (barWidth + barSpacing),
				topSpacing + 256 - audioData[i],
				barWidth,
				barHeight
			);
		}
		ctx.restore();

		
	}
	
	
	startTheta = startTheta >= Math.PI*2 ? 0 : startTheta+(Math.PI/180 * avgAudioData/255);
	// 5 - draw circles
	if(params.showCircles) {
		let centerX = canvasWidth/2;
		let centerY = canvasHeight/2;
		lepLIB.drawPhyllotaxis(
			ctx,
			centerX,
			centerY,
			lepLIB.averageIntArray(audioData, 8, 0)/255 * 800, //maxN
			lepLIB.averageIntArray(audioData, 8, 1)/255 * 16, //DotSpacing
			lepLIB.averageIntArray(audioData, 8, 2)/255 * 4, //DotSizeInner
			lepLIB.averageIntArray(audioData, 8, 2)/255 * 4, //DotSizeOutter
			lepLIB.averageIntArray(audioData, 8, 3)/255 * .2, //DotDensity
			lepLIB.averageIntArray(audioData, 8, 4)/255 * 36, //Divergence
			lepLIB.averageIntArray(audioData, 8, 5) + 25, //h
			lepLIB.averageIntArray(audioData, 8, 6) + 25, //s
			lepLIB.averageIntArray(audioData, 8, 7) + 25, //l
			true //overrides the max phyllotaxis values
		);
		
		//let startTheta = 0;
		for(let i = 0; i < audioData.length; i+=8) {

			let x = i/audioData.length * canvasWidth + 100;
			let y = canvasHeight-audioData[i]/255*(canvasHeight-100);
			
			if(params.spin){
				/*if(i == 0) {
					x = centerX
					y = centerY;
				}
				else {*/
					let theta = -(i)/(audioData.length) * 2 * Math.PI + startTheta;
					let r = 150 + (Math.random() * 2-4);
					x = r*Math.cos(theta) + centerX;
					y = r*Math.sin(theta) + centerY;

				//}
			}

			
			let maxN = audioData[i]/255 * 200;
			let dotSize = audioData[i+2]/255 * 2 + .5;
			
			let dotSpacing = audioData[i+1]/255 * 8;

			let dotDensity = audioData[i+3]/255 * .2;
			let divergence = audioData[i+4]/255 * 36;// * 10;
			let h = audioData[i+5];
			let s = audioData[i+6];
			let l = audioData[i+7];
			let a = .1;
			lepLIB.drawPhyllotaxis(ctx, x, y, maxN, dotSpacing, dotSize, dotSize, dotDensity, divergence,h,s,l,a);

		}
	}
	
	if(params.showBigPhyllo) {
		
	}
	
	if(params.showCauldron) {
		
		//add background
		ctx.save();
		ctx.fillStyle = "rgb(63,63,116)";
		ctx.beginPath();
		ctx.rect(0,0, canvasWidth, canvasHeight);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		ctx.save();
		ctx.imageSmoothingEnabled = false;
		
		//add clouds
		//clouds are bezier curves, waveform determines frequency
		let waveCount = 0;
		let startX = 0;
		for(let i = 0; i < waveData.length; i++) {
			if(waveData[i] > 128)
				waveCount++;
		}
		if(waveCount > waveData.length/2 && Math.random() > .9) {
			//create the cloud at somewhere in (40,40) to (40, 72)
			clouds.push(0);
			cloudsY.push((Math.random() * 20 + 4) * pixelHeight);
		}
		
		for(let i = 0; i < clouds.length; i++) {
			
			if(clouds >= startX + 32 * pixelHeight) {
				clouds.splice(i);
				cloudsY.splice(i);
			}
			
			ctx.drawImage(cloudImg, startX + clouds[i], cloudsY[i], cloudImg.width * pixelWidth, cloudImg.height/2 *pixelHeight);
			clouds[i] ++;
		}
		
		//add scene
		ctx.drawImage(sceneImg, 0, 0, canvasWidth, canvasHeight);
		
		//add flowers
		//6.5,30 to 33.5,30
		//flowers are 9 apart
		//for(let p = 0; p < 3; p++) {

			for(let i = 0; i < 12; i++) {
				//do phyllotaxis
				let x = (6.5 + 9 * (i%4)) * pixelWidth + 5;
				
				if(i >= 8)
					x += 3 * pixelWidth;
				else if (i >= 4)
					x -= 3 * pixelWidth;
				
				let y = (24-audioData[(i) * 8]/255 * 10) * pixelHeight;

				let maxN = audioData[i]/255 * 30;
				let dotSize = audioData[i+2]/255 * 2 + .5;

				let dotSpacing = audioData[i+1]/255 * 8;

				let dotDensity = audioData[i+3]/255 * .2;
				let divergence = 137.5;//audioData[i+4]/255 * 72;
				let h = (i*8)/audioData.length * 255;
				let s = 75;
				let l = 50;
				let a = 1;
				let points = lepLIB.drawPhyllotaxis(ctx, x, y, maxN, dotSpacing, dotSize, dotSize, dotDensity, divergence,h,s,l,a, true, false);

				ctx.save();
				ctx.strokeStyle = "green";
				ctx.lineWidth = 5;
				ctx.beginPath()
				let startY = 31 * pixelHeight;
				for(let j = 1; j < waveData.length; j++) {
					let a = (waveData[j-1] - 255/2)/255 * 50;
					let b = (waveData[j] - 255/2)/255 * 50;

					let ptA = {x: x+a, y: startY - ((j-1)/waveData.length * (startY - y))};
					let ptB = {x: x+b, y: startY - ((j)/waveData.length * (startY - y)) };

					ctx.quadraticCurveTo(ptA.x, ptA.y,
										 (ptA.x + ptB.x)/2, (ptA.y+ptB.y)/2);
				}
				//ctx.closePath();
				ctx.stroke();
				ctx.restore();

				//do bezier of waveform for the stem, height should be corresponding section's loudness
				ctx.save();
				ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`;
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(x, y);
				for(let j = 1; j < points.length - 1; j++) {
					let prevpt = points[j-1];
					let pt = points[j];
					//let nextpt = points[j]

					ctx.quadraticCurveTo(prevpt.x, prevpt.y,
									 (pt.x + prevpt.x)/2, (pt.y + prevpt.y)/2);
									 //nextpt.x, nextpt.y);
				}
				//ctx.closePath();
				ctx.stroke();
				ctx.restore();


			}
		//}
		
		//add cauldronswirl
		//ctx.putImageData(colorizeSwirl(avgAudioData*2, avgAudioData, avgAudioData*2),0,0,canvasWidth,canvasHeight);
		ctx.drawImage(swirlImg,0,0,canvasWidth,canvasHeight);
		ctx.save();
		ctx.fillStyle = `hsl(${avgAudioData/255 * 240+120}, ${avgAudioData/255 * 50 + 50}%, ${avgAudioData/255*50 + 50}%)`;
		ctx.globalAlpha=.5;
		ctx.beginPath();
		ctx.rect(13 * pixelWidth,47 * pixelHeight,40 * pixelWidth,9*pixelHeight);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		
		//add cauldron
		ctx.drawImage(cauldronImg, 0,0, canvasWidth, canvasHeight);
		
		
		//add bubbles (13, 47) -> (52,51)
		if(Math.random() < avgAudioData/255) {
			bubbles.push({x:(Math.random() * 39 + 13) * pixelWidth, y: (Math.random() * 4 + 47) * pixelHeight});
			bubbleSizes.push(Math.random() * pixelHeight*2 + 10);
		}
		
		for(let i = 0; i < bubbles.length; i++) {
			ctx.save();
			ctx.globalAlpha = bubbles[i].y/canvasHeight;
			ctx.drawImage(note, bubbles[i].x, bubbles[i].y, bubbleSizes[i], bubbleSizes[i]);
			ctx.restore();
			bubbles[i].y -= bubbleSizes[i]/(pixelHeight*2 + 10);
			if(bubbles[i].y < 0) {
				bubbles.splice(i,1);
				bubbleSizes.splice(i,1);
			}
		}
		
		
		ctx.restore();
	}
	
	
	// 6 - bitmap manipulation
	// TODO: right now. we are looping though every pixel of the canvas (320,000 of them!), 
	// regardless of whether or not we are applying a pixel effect
	// At some point, refactor this code so that we are looping though the image data only if
	// it is necessary

	// A) grab all of the pixels on the canvas and put them in the `data` array
	// `imageData.data` is a `Uint8ClampedArray()` typed array that has 1.28 million elements!
	// the variable `data` below is a reference to that array 
	
	
	/*imageData = ctx.getImageData(0,0,canvasWidth, canvasHeight);
	data = imageData.data;
	length = data.length;
	width = imageData.width;
		*/
	//doing this every single time causes weird hitches/lagging in the visuals.
	if(params.showNoise || params.showInvert || params.showEmboss) {
		let imageData = ctx.getImageData(0,0,canvasWidth, canvasHeight);
		let data = imageData.data;
		let length = data.length;
		let width = imageData.width;
		// B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
		for(let i = 0; i < length; i += 4){
			// C) randomly change every 20th pixel to red
			if(params.showNoise && Math.random() < avgAudioData/(255*2)){//< .05) {

				// data[i] is the red channel
				// data[i+1] is the green channel
				// data[i+2] is the blue channel
				// data[i+3] is the alpha channel
				//data[i] = data[i+1] = data[i + 2] = 0;// zero out the red and green and blue channels
				data[i] = Math.random() * 255;// make the red channel 100% red
				data[i+1] = Math.random() * 255;// make the red channel 100% red
				data[i+2] = Math.random() * 255;// make the red channel 100% red
			} // end if
			if(params.showInvert) {
				let red = data[i], green = data[i+1], blue = data[i+2];
				data[i] = 255-red;
				data[i + 1] = 255-green;
				data[i + 2] = 255 - blue;
			}

		} // end for

		if(params.showEmboss) {
			for(let i = 0; i < length; i++) {
				if(i%4 == 3) continue;
				data[i] = 127 + 2*data[i] - data[i+4] - data[i + width*4];
			}
		}
		// D) copy image data back to canvas
		ctx.putImageData(imageData, 0, 0);	
	}
}

function reset() {
	songAverages = new Uint8Array(sampleSize);
	songAverages.fill(255/2);
	tick = 0;
}
function setPlaying(value) {
	playing = value;
}

export {setupCanvas,draw, reset, setPlaying};
(function () {
// Global variables
var gameCanvas=null;
var gameContext=null;
var imageAtlas=null; // atlas of most of game images
var backgroundImage=null; //scrolling starry night background
var controlPanel = null;
var player = null; // the spacecraft
var allObstacles = []; // array of asteroids or space junk
var physicsWorld = null;
var loadedImages=0;
var numberOfImages=2;
var imageLoadingComplete=false;
var imagesReady=false;
var currentScore=0;
var then=null; // keeping track of time
var tick1 = 0; // wall clock tick 1 used for slower movement like background scroll
var tick2 = 0; // wall clock tick 2 used for spacecraft movement
var scrollIndex =0; // used for scrolling the starry night sky
var backgroundSong = null;
var audioOn = true;
// some constants
var STARTMENU = true;
var PHYSICSSCALEFACTOR = 64;
var PLAYER = 2; // to identify spacecraft for physics category and filtering and type for responding to events
var TARGET = 4; // to identify spacecraft for physics category and filtering and type for responding to events
var OBSTACLE = 8; // to identify spacecraft for physics category and filtering and type for responding to events
var XEXPONENTMIN = 0; // the min possible value of the exponent of x
var XEXPONENTMAX = 4; // the max possible value of the exponent of x
var XCOEFFMIN = -3; // the min possible value of the coefficient of x
var XCOEFFMAX = 3; // the max possible value of the coefficient of x
var BMIN = -3; // the min possible value of the b value (f(x) = m*x + b)
var BMAX = 3; // the max possible value of the b value
var MAXNUMBER = 4; // the max number of the grid
var GRAPHSIZE = 570; // the width and height in pixels of the graph
var GRAPHLOCX = 15; // the x value upper left corner of the graph
var GRAPHLOCY = 15; // the y value of the upper left corner of the graph
var TARGETIMAGEOFFSETX = 0; // x location in imageAtlas of the energy ball image
var TARGETIMAGEOFFSETY = 83; // y location in imageAtlas of the energy ball image
var TARGETIMAGESRCWIDTH = 40; // the width of the energy ball in the imageAtlas
var TARGETIMAGESRCHEIGHT = 40; // the height of the energy ball in the imageAtlas
var TARGETIMAGEWIDTH = 20; // the width of the energy ball in the display
var TARGETIMAGEHEIGHT = 20; // the height of the energy ball in the display
var NUMTARGETS = 20; // the number of energy balls to create
var NUMOBSTACLES = 20;  // the number of asteroids to create
var NUMOBSTACLEIMAGES = 3; // the number of different asteroid images in the imageAtlas
var OBSTACLEIMAGESIZE = 50; // the width and height of the asteroid images in the imageAtlas
var OBSTACLEIMAGESTARTX = 0; // the x location of the first asteroid image in the imageAtlas
var OBSTACLEIMAGESTARTY = 300; // the y location of the first asteroid image in the imageAtlas
var LASTOBSTACLEIMAGEX = 150; // the x location of the last obstacle image in the image Atlas
var NUMPOINTS = 200; // number of points to plot for drawing the equation; also used for the path of the spacecraft
var BACKGROUNDIMAGEWIDTH = 1100; // width of starry night background
var BACKGROUNDIMAGEHEIGHT = 700; // height of starry night background
var OUTSIDEGRAPHLIMITS = false;



//Shortening the Box2D calls
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2MassData = Box2D.Collision.Shapes.b2MassData;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;

// a prototype game object; note that the x and y values represent the center of the object not the upper left corner (draw function adjusts for this)
var gameItem = {
  x: 0, // x value of center of object
	y: 0,  // y value of center of object
	width: 0, // width of object
	height: 0, // height of object
	visible: true,
	imageSrc: null, // place to store name of image source file
	imageSrcXOffset: 0, // the x location of the upper left corner of the image in the atlas
	imageSrcYOffset: 0, // the y location of the upper left corner of the image in the atlas
	imageSrcWidth: 0, // the width of the image in the atlas
	imageSrcHeight: 0, // the height of the image in the atlas
	lastImageSrcX: 0, // the x value of the last image of this type in the atlas
	imageObj: null, // the atlas image object
	physicsBody: null,
	type: null, // type of item e.g. TARGET, OBSTACLE, PLAYER
	// a method to initialize the values
	initialize: function(x, y, width, height, imageObj, imageSrcXOffset, imageSrcYOffset, imageSrcWidth, imageSrcHeight, lastImageSrcX) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.imageObj = imageObj;
		this.imageSrcXOffset = imageSrcXOffset;
		this.imageSrcYOffset = imageSrcYOffset;
		this.imageSrcWidth = imageSrcWidth;
		this.imageSrcHeight = imageSrcHeight;
		this.lastImageSrcX = lastImageSrcX;
		},
	// a method to draw the object - adjusts x, y to upper left corner
	draw: function() {
	if (this.visible) {
	gameContext.drawImage(this.imageObj, this.imageSrcXOffset, this.imageSrcYOffset, this.imageSrcWidth, this.imageSrcHeight, this.x-(this.width/2), this.y - (this.height/2), this.width, this.height);
	}
	}
	}
	
	// A prototype of the player  - the spacecraft
	var playerItem = Object.create(gameItem);
	playerItem.traversing = false; // keep track of whether the spacecraft is being moved along a path
	playerItem.path = [];  // the path for the spacecraft to follow based on the equation in the console
	playerItem.currentPathIndex = 0;  // keep track of how far along path
	playerItem.type = PLAYER;
	// advance to the next image in the imageAtlas for animating; when end is reached reset to zero (images must start at zero - this needs fixing...)
	playerItem.nextImage = function() {
				player.imageSrcXOffset = player.imageSrcXOffset + player.imageSrcWidth;
			if (player.imageSrcXOffset > player.lastImageSrcX) {player.imageSrcXOffset=0;}
			}
	

// A prototype to handle univariate equations in the form f(x) = xCoeff*x^xExponent + b	
var equationEntity = {
	xCoeff: 0, // the coefficient of x
	xExponent: 0, // the exponent of x
	b: 0, // the b value
	numPoints: 0, // the number of points to be plotted or displayed as images, used as a path, etc.
	pointsArray: null, // the array of the points
	minX: 0, // the boundaries
	maxX: 0,
	maxY: 0,
	
	initializeEquationSettings: function(xCoeff, xExponent, b, numPoints) {
	this.xCoeff = xCoeff;
	 this.xExponent = xExponent;
	this.b = b;
	 this.numPoints = numPoints;
	 this.calculatePoints();
	},
	
	calculatePoints: function() {
	var xAtYMin;
	var xAtYMax;
	if (this.xExponent == 0 || this.xCoeff == 0) {
	    this.maxX = MAXNUMBER;
		this.minX = -MAXNUMBER;
	}
	else
	{
	// find x value where f(x) reaches max and min values that can be displayed based on the maximum displayable number on the graph
	//	added workaround for odd roots of negative numbers since Math.pow returns NaN for those
	// 
	if (((this.xExponent % 2) != 0) && (((MAXNUMBER-this.b)/this.xCoeff) < 0)) {
		xAtYMax = -Math.pow(Math.abs((MAXNUMBER-this.b)/this.xCoeff), 1/this.xExponent);
	}
	else {
		xAtYMax = Math.pow((MAXNUMBER-this.b)/this.xCoeff, 1/this.xExponent);
	}
	if (((this.xExponent % 2) != 0) && (((-MAXNUMBER-this.b)/this.xCoeff) < 0)) {
		xAtYMin = -Math.pow(Math.abs((-MAXNUMBER-this.b)/this.xCoeff), 1/this.xExponent);
		}
	else {
		xAtYMin = Math.pow((-MAXNUMBER-this.b)/this.xCoeff, 1/this.xExponent);
	}
	
		if (isNaN(xAtYMin)  && isNaN(xAtYMax)) { 
			this.maxX = MAXNUMBER;
			this.minX = -MAXNUMBER;}
		else if (isNaN(xAtYMin)) { 
			this.minX = -Math.abs(xAtYMax);
			this.maxX = Math.abs(xAtYMax);}
		else if (isNaN(xAtYMax)) {
			this.minX = -Math.abs(xAtYMin);
			this.maxX = Math.abs(xAtYMin);}
		else if (xAtYMin < xAtYMax) {
			this.minX = -Math.abs(xAtYMin);
			this.maxX = Math.abs(xAtYMax);
		}
		else {
			this.minX = xAtYMax;
			this.maxX = xAtYMin
		}

	}
	 //If f(x) reaches MAXNUMBER of grid when x is out of bounds, set maxX to MAXNUMBER
			if (this.maxX > MAXNUMBER) this.maxX = MAXNUMBER;
			if (this.minX < -MAXNUMBER) this.minX = -MAXNUMBER;
			if ((this.xExponent === 0)  && (Math.abs(this.xCoeff + this.b) > MAXNUMBER)) {
				OUTSIDEGRAPHLIMITS = true;
				}
			else {
				OUTSIDEGRAPHLIMITS = false;
			}
		 var currentx = this.minX;
		 // scaleFactor calculation adds one to provide deadspace beyond MAXNUMBER; is doubled because range will be -MAXNUMBER to +MAXNUMBER
		 var scaleFactor = GRAPHSIZE/((MAXNUMBER + 1)*2);
		 // how much to increment x when calculating each point
		var xStep = (this.maxX - this.minX)/(this.numPoints-1);
		this.maxY = 0;
	if (!this.pointsArray) this.pointsArray = new Array(this.numPoints); // only create a new array first time, otherwise pointsArray is recycled
	// set values for x and y
		for (var i=0; i < this.numPoints; i++) {
		    if (!this.pointsArray[i]) {
				this.pointsArray[i] = Object.create(gameItem); // only create first time; after that, recycle
				}
			this.pointsArray[i].x = currentx * scaleFactor + (GRAPHSIZE)/2 + GRAPHLOCX;
			this.pointsArray[i].y =  (GRAPHSIZE)/2 -(this.xCoeff*(Math.pow(currentx, this.xExponent)) + this.b) * scaleFactor + GRAPHLOCY;
			this.pointsArray[i].visible = true;
			currentx = currentx + xStep;
		}
	},
// plots the equation in red	
	draw: function() {
		if (this.pointsArray) {
			gameContext.strokeStyle = "rgb(256, 0, 0)";
			gameContext.beginPath();
			gameContext.moveTo(this.pointsArray[0].x,this.pointsArray[0].y);
			for (var i=0; i < this.pointsArray.length; i++) {
			if (this.pointsArray[i].visible) {
			gameContext.lineTo(this.pointsArray[i].x, this.pointsArray[i].y);
        }
		}
		gameContext.stroke();
		}
	},

// add physics to the points of the equation 	
	addPhysics: function(entityType) {
	var equationPointFixture = new b2FixtureDef;
	equationPointFixture.density = 1.0;
	equationPointFixture.friction = 0.0;
	equationPointFixture.restitution = 1.0;
	equationPointFixture.filter.categoryBits = TARGET;
	equationPointFixture.filter.maskBits = PLAYER;
	var equationPointBodyDef = new b2BodyDef;
	equationPointBodyDef.type = b2Body.b2_dynamicBody;
	equationPointFixture.shape = new b2CircleShape((TARGETIMAGEWIDTH/2)/PHYSICSSCALEFACTOR);
	equationPointFixture.isSensor = true;
	for (var i=0; i < this.numPoints; i++) {
		equationPointBodyDef.position.x = this.pointsArray[i].x/PHYSICSSCALEFACTOR;
    equationPointBodyDef.position.y = this.pointsArray[i].y/PHYSICSSCALEFACTOR;
    equationPointBody = physicsWorld.CreateBody(equationPointBodyDef);
	equationPointBody.CreateFixture(equationPointFixture);
	equationPointBody.SetUserData(this.pointsArray[i]);
    this.pointsArray[i].physicsBody = equationPointBody;
	this.pointsArray[i].type = entityType;
		};

	},
	// update the physics positions based on values in the pointsArray
		updatePhysicsPositions: function() {
		for (var i=0; i < this.numPoints; i++) {
		this.pointsArray[i].physicsBody.SetPosition({x: this.pointsArray[i].x/PHYSICSSCALEFACTOR, y: this.pointsArray[i].y/PHYSICSSCALEFACTOR});
		}
		}
	}

	// A prototype for an equation with user input; includes input widget
var equationEntityWithUserInput = Object.create(equationEntity);
equationEntityWithUserInput.inputWidgetLocX = GRAPHSIZE + GRAPHLOCX;
equationEntityWithUserInput.inputWidgetLocY = GRAPHLOCY;
equationEntityWithUserInput.inputWidgetWidth = 200;
equationEntityWithUserInput.inputWidgetHeight = 200;

equationEntityWithUserInput.drawInputWidget = function() {
 	   	gameContext.save();
		gameContext.translate(this.inputWidgetLocX, this.inputWidgetLocY);
		// write the function
		gameContext.font = "italic 36px Georgia";
		gameContext.fillStyle = "rgb(0, 0, 0)";
		gameContext.fillText('f(x)=', 7, 73);
		gameContext.textAlign = "center";

		gameContext.fillText(this.xCoeff, 105, 73);
		gameContext.fillText('x', 132, 73);
		gameContext.font = "italic 28px Georgia";
		gameContext.fillText(this.xExponent, 150, 61);
		   gameContext.font = "italic 36px Georgia";
		if (this.b < 0) {
			gameContext.fillText(' - ', 170, 73);
		} 
		else {
			gameContext.fillText(' + ', 170, 73);
			}
		gameContext.fillText(Math.abs(this.b), 192, 73);
		// Draw up and down arrows for coefficient of x
		gameContext.drawImage(imageAtlas, 200, 0, 25, 25, 90, 8, 30, 30);
		gameContext.drawImage(imageAtlas, 240, 0, 25, 25, 90, 86, 30, 30);
		// Draw up and down arrows for exponent of x
		gameContext.drawImage(imageAtlas, 200, 0, 25, 25, 135, 8, 30, 30);
		gameContext.drawImage(imageAtlas, 240, 0, 25, 25, 135, 86, 30, 30);
		//Draw up and down arrows for b value of equation
		gameContext.drawImage(imageAtlas, 200, 0, 25, 25, 176, 8, 30, 30);		
		gameContext.drawImage(imageAtlas, 240, 0, 25, 25, 176, 86, 30, 30);
		// draw GO button
		gameContext.drawImage(imageAtlas, 300, 0, 32, 32, 80, 135, 60, 60);	
	gameContext.restore();
};

equationEntityWithUserInput.mouseDownHandler = function(mouseX, mouseY){
var widgetX = this.inputWidgetLocX;
var widgetY = this.inputWidgetLocY;
//console.log(mouseX, mouseY);
	//Adjust mouse cursor seemed like it was not at tip - maybe switch to pointing hand?
	mouseX = mouseX - 5;
	mouseY = mouseY - 5;

	//Mouse click on up arrow for the coefficient of x in the equation
	if (insideRect(mouseX, mouseY, widgetX+82, widgetY+0, 46, 46)) {
		 userEquation.xCoeff++;
		if (userEquation.xCoeff > XCOEFFMAX) {
			userEquation.xCoeff = XCOEFFMAX;
		};
		userEquation.calculatePoints();
	}
	// Mouse click on down arrow for the coefficient of x in the equation
	else if (insideRect(mouseX, mouseY, widgetX+82, widgetY+78, 46, 46)) {
		userEquation.xCoeff--;
		if (userEquation.xCoeff < XCOEFFMIN) {
			userEquation.xCoeff = XCOEFFMIN;
		}
		userEquation.calculatePoints();
	 }
	 // Mouse click on up arrow for the exponent of x of equation
	 else if (insideRect(mouseX, mouseY, widgetX+127, widgetY+0, 46, 46)) {
		 userEquation.xExponent++;
		if (userEquation.xExponent > XEXPONENTMAX) {
			userEquation.xExponent = XEXPONENTMAX;
		};
		userEquation.calculatePoints();
	}
	// Mouse click on down arrow for the exponent of x of equation
	else if (insideRect(mouseX, mouseY, widgetX+127, widgetY+78, 46, 46)) {
		userEquation.xExponent--;
		if (userEquation.xExponent < XEXPONENTMIN) {
			userEquation.xExponent = XEXPONENTMIN;
		}
		userEquation.calculatePoints();
	 }
	 // Mouse click on up arrow for b value of equation
	else if (insideRect(mouseX, mouseY, widgetX+168, widgetY+0, 46, 46)) {
		 userEquation.b++;
		if (userEquation.b > BMAX) {
			userEquation.b = BMAX;
		};
		userEquation.calculatePoints();
	}
	// Mouse click on down arrow for b value of equation
	else if (insideRect(mouseX, mouseY, widgetX+168, widgetY+78, 46, 46)) {
		userEquation.b--;
		if (userEquation.b < BMIN) {
			userEquation.b = BMIN;
		}
		userEquation.calculatePoints();
	 }
	// Mouse click on GO button
	 else if (insideRect(mouseX, mouseY, widgetX+80, widgetY+135, 60, 60)) {
	 player.traversing=true;
	 player.path=userEquation.pointsArray;
	 player.currentPathIndex=0;
	 }
	
	}	

// Prototype for an equation with images displayed at the points - used for the energy balls	
var equationEntityWithImages = Object.create(equationEntity);

equationEntityWithImages.initializeImageSettings = function(imageAtlas, srcOffsetX, srcOffsetY, srcWidth, srcHeight, displayWidth, displayHeight) {
	 	 for (var i=0; i < this.numPoints; i++) {
				this.pointsArray[i].imageObj = imageAtlas;
				this.pointsArray[i].imageSrcXOffset = srcOffsetX;
				this.pointsArray[i].imageSrcYOffset = srcOffsetY;
				this.pointsArray[i].imageSrcWidth = srcWidth;
				this.pointsArray[i].imageSrcHeight = srcHeight;
				this.pointsArray[i].width = displayWidth;
				this.pointsArray[i].height = displayHeight;
				}
				};
	 equationEntityWithImages.draw = function() {

		if (this.pointsArray) {
		for (var i=0; i < this.pointsArray.length; i++) {
		this.pointsArray[i].draw();
		}
		}
		};
	

// just keeping track of the image loading
var imageHasLoaded = function() {
    loadedImages++;
    if (loadedImages == numberOfImages) {
	    imageLoadingComplete=true;
		};
	};
	

var loadImages = function() {
	backgroundImage = new Image();
	backgroundImage.onload=imageHasLoaded;
	backgroundImage.src = "images/spacebackground.png";
	imageAtlas = new Image();
	imageAtlas.onload=imageHasLoaded;
	imageAtlas.src = "images/spaceatlas.png";
	};

// the song - only works in chrome; checks audioOn flag so audio can be toggled
var loadAndPlaySong = function() {
	backgroundSong = new Audio("music/DST-AngryRobotIII.mp3");
	backgroundSong.addEventListener('ended', function() {
		this.currentTime = 0;
		if (audioOn) this.play();
		}, false);
	if (audioOn) backgroundSong.play();
}
	
// just the brushed metal panel	
var createControlPanel = function() {
		controlPanel = Object.create(gameItem);
		controlPanel.initialize(400, 300, 800, 600, imageAtlas, 400, 0, 800, 600, 0);
			
	}	

// draw the messaging area in the control panel and display the current score and Advance Mode notification	
var drawMessageConsole = function() {
	gameContext.save();
	gameContext.translate(620, 300);
	 	   	gameContext.fillStyle = "rgb(0, 0, 0)";
	gameContext.fillRect(0, 0, 150, 100);
 	   	gameContext.fillStyle = "rgb(0, 256, 0)";
		gameContext.fillText('Score: ' + currentScore, 15, 20);
		if (currentScore >= 100) gameContext.fillText('Advanced Mode', 10, 60);
				if (currentScore >= 100) gameContext.fillText('No Preview', 25, 80);

		gameContext.restore();
}		

// draw the coordinate grid 
var drawGrid = function() {
	gameContext.save();
	gameContext.translate(GRAPHLOCX, GRAPHLOCY);
    gameContext.fillStyle = "rgba(0, 256, 0, .5)";
    gameContext.strokeStyle = "rgba(0, 256, 0, .5)";
    gameContext.beginPath();
	//draw y axis
    gameContext.moveTo(GRAPHSIZE/2, 0);
	gameContext.lineTo(GRAPHSIZE/2, GRAPHSIZE);
	//draw x axis
    gameContext.moveTo(0, 0 + GRAPHSIZE/2);
	gameContext.lineTo(GRAPHSIZE, GRAPHSIZE/2);
	for (var i=1; i < 10; i++) {
	    gameContext.moveTo( (GRAPHSIZE/2) -10, i*(GRAPHSIZE/10));
        gameContext.lineTo((GRAPHSIZE/2) + 10, i * (GRAPHSIZE/10));
	    gameContext.moveTo(i * (GRAPHSIZE/10), (GRAPHSIZE/2)-10);
        gameContext.lineTo(i * (GRAPHSIZE/10), (GRAPHSIZE/2)+10);
        }
	gameContext.rect(GRAPHSIZE/10, GRAPHSIZE/10, GRAPHSIZE-2*(GRAPHSIZE/10), GRAPHSIZE-2*GRAPHSIZE/10);
	gameContext.fillText('4', GRAPHSIZE-GRAPHSIZE/10 +2, GRAPHSIZE/2 + 17);
	gameContext.fillText('4', GRAPHSIZE/2 + 2, GRAPHSIZE/10+17);
	gameContext.fillText('-4', GRAPHSIZE/10 -20, GRAPHSIZE/2 +17);
	gameContext.fillText('-4', GRAPHSIZE/2 +2, GRAPHSIZE-GRAPHSIZE/10+17);

	gameContext.stroke();
		gameContext.restore();

};


	// create the asteroids and their physics
var createObstacles = function(numObstacles) {
	var x;
	var y;
	var diameter;
	var currentImageSrcX;
	var currentObstacle;
	var obstacleFixture = new b2FixtureDef;
	obstacleFixture.density = 0.0;
	obstacleFixture.friction = 0.0;
	obstacleFixture.restitution = 1.0;
	obstacleFixture.filter.categoryBits = OBSTACLE;
	obstacleFixture.filter.maskBits = OBSTACLE
	var obstacleBodyDef = new b2BodyDef;
	obstacleBodyDef.type = b2Body.b2_dynamicBody;
	 for (var i=0; i < numObstacles; i++) {
		  currentObstacle = Object.create(gameItem);
		// get random position for obstacle.
		  x = Math.floor(Math.random() * GRAPHSIZE);
          y = Math.floor(Math.random() * GRAPHSIZE);
		  diameter = Math.round(Math.random() * 60);
		  currentImageSrcX = Math.floor(Math.random()*NUMOBSTACLEIMAGES)*OBSTACLEIMAGESIZE;
		  currentObstacle.initialize(x, y, diameter, diameter, imageAtlas, currentImageSrcX, OBSTACLEIMAGESTARTY, OBSTACLEIMAGESIZE, OBSTACLEIMAGESIZE, LASTOBSTACLEIMAGEX);
		  currentObstacle.type = OBSTACLE;
	      obstacleBodyDef.position.x = currentObstacle.x/PHYSICSSCALEFACTOR;
          obstacleBodyDef.position.y = currentObstacle.y/PHYSICSSCALEFACTOR;
          obstacleFixture.shape = new b2CircleShape((currentObstacle.width/2)/PHYSICSSCALEFACTOR);
	      obstacleFixture.isSensor = false;
          obstacleBody = physicsWorld.CreateBody(obstacleBodyDef);
	      obstacleBody.CreateFixture(obstacleFixture);
	      obstacleBody.SetUserData(currentObstacle);
          currentObstacle.physicsBody = obstacleBody;
		  allObstacles[i] = currentObstacle;
	      }
	}

// at each reset (new equation) the asteroids are changed but objects and physics recycled	
var updateObstacles = function() {
	var currentObstacle;
		 for (var i=0; i < allObstacles.length; i++) {
		  currentObstacle = allObstacles[i];
		  		// get random position for obstacle.
		  currentObstacle.x = Math.floor(Math.random() * GRAPHSIZE);
		  currentObstacle.y = Math.floor(Math.random() * GRAPHSIZE);
		  currentObstacle.imageSrcXOffset = Math.floor(Math.random()*NUMOBSTACLEIMAGES)*OBSTACLEIMAGESIZE;
		  //console.log(currentObstacle.physicsBody);
		  //console.log(currentObstacle.x, currentObstacle.y, PHYSICSSCALEFACTOR);
		  currentObstacle.physicsBody.SetPosition({x: currentObstacle.x/PHYSICSSCALEFACTOR, y: currentObstacle.y/PHYSICSSCALEFACTOR});
		}
}	

// check to see if point is inside a rectangle - used for mouse events
var insideRect = function(x, y, rectX, rectY, rectWidth, rectHeight) {
    if ((x >= rectX) && (x <= rectX+rectWidth) && (y >= rectY) && (y <= rectY+rectHeight)) {
	    return true;
		}
	else return false;
	
};

// Turn audio off and on
var toggleAudio = function() {
	if (audioOn) {
		console.log('turning music off');
		backgroundSong.pause();
		audioOn = false;
			}
	else {
		backgroundSong.play();
		audioOn = true;
			}
};

// called when there is a mouse click down event; checks to see if inside userEquation widget area and sends for processing, else if in audio toggle area handle that
var mouseClickDown = function(event) {
		if (STARTMENU) {
			//If inside audio toggle area toggle the audio
			if (insideRect(event.pageX-5, event.pageY-5, 645, 570, 155, 20)) {
		    toggleAudio();
		  }
		else {
			STARTMENU = false;
		}
		}
		else {
	if (!player.traversing) {
		if (insideRect(event.pageX-5, event.pageY-5, userEquation.inputWidgetLocX, userEquation.inputWidgetLocY, userEquation.inputWidgetWidth, userEquation.inputWidgetHeight)) {
		userEquation.mouseDownHandler(event.pageX, event.pageY); 
		};
	};
	//If inside audio toggle area toggle the audio
	if (insideRect(event.pageX-5, event.pageY-5, 645, 570, 155, 20)) {
		toggleAudio();
		}
	}
}

// Set up a physics contact listener callback to handle when the energy balls sense a contact
var targetContactListenerCallback = new Box2D.Dynamics.b2ContactListener;
    targetContactListenerCallback.BeginContact = function(contact) 
	{ 
	// if the spacecraft is in motion handle, otherwise ignore
	if (player.traversing) {
	// get the game objects which were placed in UserData 
	var objectA = contact.GetFixtureA().GetBody().GetUserData();
    var objectB = contact.GetFixtureB().GetBody().GetUserData();
	//make sure neither is null
	if (objectA && objectB) {
	// if A is an energy ball and B is the spacecraft or vice versa then increment the score and make the energy ball invisible
	    if (objectA.type == TARGET && objectB.type == PLAYER) {
		if (objectA.visible) {
		objectA.visible = false;
		currentScore++;
		}
		}
	    if (objectA.type == PLAYER && objectB.type == TARGET) {
		if (objectB.visible) {
		objectB.visible = false;
		currentScore++;
		}
		}
	}
	}
}	

// set up the gameContext
var initializeGameContext = function() {
    gameCanvas = document.getElementById("canvas");
    gameContext = gameCanvas.getContext('2d');
    gameContext.font = "18px Helvetica";
	gameContext.textAlign = "left";
	document.onselectstart = function() {return false;}
	};

// get some random numbers for an equation that are within the range of the grid	
var setRandomEquationParameters = function() {
	var xCoeff = Math.round(Math.random() * (XCOEFFMAX - XCOEFFMIN)) + XCOEFFMIN;
	var xExponent = Math.round(Math.random() * (XEXPONENTMAX - XEXPONENTMIN)) + XEXPONENTMIN;
	var b = Math.round(Math.random() * (BMAX - BMIN)) + BMIN;
	// redo if y too large or small to fit grid
	if ((xExponent == 0)  && (Math.abs(xCoeff + b) > MAXNUMBER)) xExponent = 2;
	targetEquation.initializeEquationSettings(xCoeff , xExponent, b, NUMTARGETS);
	targetEquation.updatePhysicsPositions();
	}
	

// update the game based on the time
var update = function(deltaTime) {
	tick1 = tick1 + deltaTime;
    tick2 = tick2 + deltaTime;
	if (tick1 > 150) {
	// scrollIndex is used as the x offset of the source image when
			scrollIndex++;
			if (scrollIndex >= BACKGROUNDIMAGEWIDTH) scrollIndex=0;
		    tick1 = 0;
		//animate the spacecraft sprite
		player.nextImage();
			// bump the asteroids with physics to give them a little movement
		for (var i=0;i < allObstacles.length; i++) {
					allObstacles[i].physicsBody.ApplyImpulse(new b2Vec2((Math.round(Math.random()) * 2 - 1)/400, (Math.round(Math.random()) * 2 - 1)/400), allObstacles[i].physicsBody.GetWorldCenter());
					}		
	}
	// if spacecraft is in traversing mode, move it to the next point and update physics
	if (player.traversing) {
		    if (tick2 > 25){
		    player.x = player.path[player.currentPathIndex].x;
		    player.y = player.path[player.currentPathIndex].y;
			player.physicsBody.SetPosition({x: (player.x)/PHYSICSSCALEFACTOR, y: (player.y)/PHYSICSSCALEFACTOR});
			player.currentPathIndex++;
			if (player.currentPathIndex == player.path.length) {
			    player.traversing = false;
				player.currentPathIndex = 0;
				resetGame();
				}
				tick2 = 0;}			
        };

	physicsWorld.Step(1/60 , 8 , 3);
	physicsWorld.ClearForces();
	// update asteroid x, y values to reflect physics world values
	for (var i=0; i < allObstacles.length; i++) {
		allObstacles[i].x = allObstacles[i].physicsBody.GetPosition().x * PHYSICSSCALEFACTOR;
		allObstacles[i].y = allObstacles[i].physicsBody.GetPosition().y * PHYSICSSCALEFACTOR;
           };
}

// render the game to the canvas
var renderGame = function() {
// wait for all images to load
	if (imageLoadingComplete) {
	// draw the starry night background; as scrollIndex is incremented the background will scroll
		gameContext.drawImage(backgroundImage, scrollIndex, 0, BACKGROUNDIMAGEHEIGHT, BACKGROUNDIMAGEHEIGHT, GRAPHLOCX, GRAPHLOCY, GRAPHSIZE, GRAPHSIZE);
	// draw the asteroids
	  for (var i=0; i < allObstacles.length; i++) {
	    obstacle = allObstacles[i];
		obstacle.draw();
	    //gameContext.drawImage(imageAtlas, 0, 300, 50, 50, allObstacles[i].x-35.5, allObstacles[i].y-35.5, 71, 71);
		}
	// draw the spacecraft
		player.draw();
	// draw the control panel
		controlPanel.draw();
	// draw the equation, arrows buttons, and go button
		userEquation.drawInputWidget();
	// draw the energy balls
		targetEquation.draw();
	// draw the coordinate grid
		drawGrid();
	// if not in advanced mode or if spacecraft is in traverse mode, draw the user input equation
		if ((currentScore < 100) || (player.traversing)) userEquation.draw();
	// draw the message console which includes current score
		drawMessageConsole();
			// warning text if equation outside of graph limits	
		if (OUTSIDEGRAPHLIMITS) {
			gameContext.save();
			gameContext.fillStyle = "rgb(255, 0, 0)";
			gameContext.fillText('Warning: equation is outside of graph limits!', GRAPHLOCX + GRAPHSIZE/2 - 125, GRAPHLOCY + GRAPHSIZE/2 - 50);
		  gameContext.restore();
}
	// the widget for turning off the audio; need to change this to a button or something
		if (audioOn) {gameContext.fillText('TURN AUDIO OFF', 630, 580)} else {gameContext.fillText('TURN AUDIO ON', 630, 580);}
	}

		if (STARTMENU) {
			displayStartMenu();
			}

};

// reset the game; used after the spacecraft has finished traversing the path
var resetGame = function() {
	setRandomEquationParameters();
	player.x = targetEquation.pointsArray[0].x - 35;
    player.y = targetEquation.pointsArray[0].y - 35;
	player.physicsBody.SetPosition({x: (player.x)/PHYSICSSCALEFACTOR, y: (player.y)/PHYSICSSCALEFACTOR});
		updateObstacles();
	};
			
var initializePlayer = function() {
	player = Object.create(playerItem);
	player.initialize(0, 0, 64, 64, imageAtlas, 0, 610, 100, 100, 600)
	player.type = PLAYER;
	// set the spacecraft just to the upper left of the beginning of the energy balls
	player.x = targetEquation.pointsArray[0].x - 35;
    player.y = targetEquation.pointsArray[0].y - 35;
	// add physics to spacecraft - a method needs to be added to the prototype but out of time to do that now...
	var playerFixture = new b2FixtureDef;
	playerFixture.density = 1.0;
	playerFixture.friction = 0.0;
	playerFixture.restitution = 1.0;
	// set the filters so we can ignore collisions between spacecraft and asteroids; will possibly add shooting of asteroids later
	playerFixture.filter.categoryBits = PLAYER;
	playerFixture.filter.maskBits = TARGET;
	var playerBodyDef = new b2BodyDef;
	playerBodyDef.type = b2Body.b2_kinematicBody;
	playerBodyDef.position.x = player.x/PHYSICSSCALEFACTOR;
    playerBodyDef.position.y = player.y/PHYSICSSCALEFACTOR;
    playerFixture.shape = new b2CircleShape(.5);
    playerBody = physicsWorld.CreateBody(playerBodyDef)
	playerBody.CreateFixture(playerFixture);
    playerBody.SetUserData(player);
    player.physicsBody = playerBody;	
	}

var initializePhysicsWorld = function() {
	var gravity = new b2Vec2(0, 0);
	var sleepToggle = false;
	physicsWorld = new b2World(gravity, sleepToggle);
	physicsWorld.SetContactListener(targetContactListenerCallback);
};

var displayStartMenu = function() {

	gameContext.save();


	gameContext.drawImage(backgroundImage, scrollIndex, 0, BACKGROUNDIMAGEHEIGHT, BACKGROUNDIMAGEHEIGHT, 0, 0, gameCanvas.width, gameCanvas.height);
	gameContext.fillStyle = "rgb(255, 255, 255)";
	gameContext.font = "72px Helvetica";
	gameContext.textAlign = "center";
	gameContext.fillText("Space Math", gameCanvas.width/2.0, gameCanvas.height/2.0-80);
	gameContext.font = "16px Helvetica";
	gameContext.fillText("Steer your spacecraft by adjusting the equation and gather as many energy balls as you can!", gameCanvas.width/2.0, gameCanvas.height/2.0 - 30);
	gameContext.font = "24px Helvetica";
	gameContext.fillText("click to play", gameCanvas.width/2.0, gameCanvas.height/2.0 + 64);
	gameContext.font = "18px Helvetica";
	//gameContext.fillText("Credits\nCoding by Dabney Blum\nImages courtesy of \nCarl Olsson opengameart.org\nOsmic villeseppanen.com\nThe GRITS game from Udacity Course 255
//\nMusic is DST-AngryRobotIII courtesy of Deceased Superior Technician nosoapradio.us", gameCanvas.width/2.0, gameCanvas.height/2.0 + 78);
		gameContext.fillText("Credits", gameCanvas.width/2.0, gameCanvas.height/2.0 + 160);
			gameContext.font = "16px Helvetica";
		gameContext.fillText("Code by Dabney Blum", gameCanvas.width/2.0, gameCanvas.height/2.0 + 182);
		gameContext.fillText("Images courtesy of Carl Olsson, Osmic, & the GRITS game", gameCanvas.width/2.0, gameCanvas.height/2.0 + 204);
		gameContext.fillText("Music is DST-AngryRobot III courtesy of Deceased Superior Technician", gameCanvas.width/2.0, gameCanvas.height/2.0 + 226);
	gameContext.textAlign = "left";

		if (audioOn) {gameContext.fillText('TURN AUDIO OFF', 630, 580)} else {gameContext.fillText('TURN AUDIO ON', 630, 580);}



	gameContext.restore();
};

// initialize the game by loading images and setting up all the items, physics, etc.; this is done once when the game is first loaded			
var initializeGame = function() {
	loadAndPlaySong();
	loadImages();
	initializeGameContext();
	createControlPanel();
	initializePhysicsWorld();
	// create the user equation object and initialize with some reasonable parameters
	userEquation = Object.create(equationEntityWithUserInput);
	userEquation.initializeEquationSettings(2, 1, -2, NUMPOINTS);
	// create the energy balls equation object and initialize with some reasonable parameters, init images and physics for them
	targetEquation = Object.create(equationEntityWithImages);
	targetEquation.initializeEquationSettings(1, 2, 1, NUMTARGETS);
	targetEquation.initializeImageSettings(imageAtlas,TARGETIMAGEOFFSETX, TARGETIMAGEOFFSETY, TARGETIMAGESRCWIDTH, TARGETIMAGESRCHEIGHT, TARGETIMAGEWIDTH, TARGETIMAGEHEIGHT); 
	targetEquation.addPhysics(TARGET);
	// Initialize the player (spacecraft) object including physics 
	initializePlayer();

	createObstacles(NUMOBSTACLES);

	addEventListener("mousedown", mouseClickDown, false);
	addEventListener("touchstart", mouseClickDown, false);
};

// the main animation loop
var animate = function() {
    var now = Date.now();
    var deltaTime = now - then;
	update(deltaTime);
	renderGame();
	window.requestAnimationFrame(animate);	
	then=now;
	};
	
// set everything up	
initializeGame();
// start looping
animate();
}());
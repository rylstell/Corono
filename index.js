

const COLOR = {
    canvasBackground: "#dddddd",
    canvasRunningBorder: "#dddd00",
    canvasPausedBorder: "#777777",
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#00cc00",
    blue: "#0000ff",
    gray50: "#323232"
};



function drawLine(ctx, p1, p2, color, width=1) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function drawCircle(ctx, center, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

function drawRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
}



class Vec2 {

    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    copy() {
        return new Vec2(this.x, this.y);
    }

    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    squaredDistanceTo(other) {
        return Math.pow((this.x-other.x), 2) + Math.pow((this.y-other.y), 2)
    }

    distanceTo(other) {
        return Math.sqrt(this.squaredDistanceTo(other));
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    squaredMagnitude() {
        return this.x * this.x + this.y * this.y;
    }

    magnitude() {
        return Math.sqrt(this.squaredMagnitude());
    }

    scaleBy(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    scaleTo(length) {
        return this.scaleBy(length / this.magnitude());
    }

    normalize() {
        return this.scaleTo(1);
    }

    angleBetween(other) {
        return Math.acos(this.dot(other) / (this.magnitude() * other.magnitude()));
    }

    isVerySimilarTo(other, tolerance=0.0001) {
        return Math.abs(this.dot(other) - this.magnitude() * other.magnitude()) < tolerance;
    }

}







class Ball {

    static STATUS = {
        good: 0,
        infected: 1,
        recovered: 2,
        dead: 3
    };

    static STATUS_COLORS = {
        [Ball.STATUS.good]: COLOR.white,
        [Ball.STATUS.infected]: COLOR.red,
        [Ball.STATUS.recovered]: COLOR.green,
        [Ball.STATUS.dead]: COLOR.black
    };

    constructor(pos, vel, radius, status, canvasWidth, canvasHeight) {
        this.pos = pos;
        this.vel = vel;
        this.radius = radius;
        this.status = status;
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.infectionTimer = 0;
        this.prevPos = this.pos.copy();
    }

    collidesWith(other) {
        let dist = this.pos.distanceTo(other.pos);
        return dist <= this.radius + other.radius;
    }

    checkWalls() {
        if (this.pos.x + this.radius > this.width) {
            this.pos.x = this.width - this.radius;
            this.vel.x *= -1;
        } else if (this.pos.x - this.radius < 0) {
            this.pos.x = this.radius;
            this.vel.x *= -1;
        }
        if (this.pos.y + this.radius > this.height) {
            this.pos.y = this.height - this.radius;
            this.vel.y *= -1;
        } else if (this.pos.y - this.radius < 0) {
            this.pos.y = this.radius;
            this.vel.y *= -1;
        }
    }

    update() {
        this.prevPos.set(this.pos.x, this.pos.y);
        this.pos = this.pos.add(this.vel);
        this.checkWalls();
        if (this.status == Ball.STATUS.infected) {
            this.infectionTimer++;
        }
    }

    draw(ctx) {
        drawCircle(ctx, this.pos, this.radius, Ball.STATUS_COLORS[this.status]);
    }
}






class Wall {

    constructor(pt1, pt2) {
        this.pt1 = pt1;
        this.pt2 = pt2;
        this.hovered = false;
        this.hoveredPt = null;
        this.calcNormal();
    }

    calcNormal() {
        this.normal = new Vec2(-(this.pt1.y - this.pt2.y), (this.pt1.x - this.pt2.x)).normalize();
    }

    projectedPoint(pt) {
        let t = (pt.sub(this.pt1)).dot(this.pt2.sub(this.pt1)) / this.pt1.squaredDistanceTo(this.pt2);
        t = Math.max(0, Math.min(1, t));
        return this.pt1.add(this.pt2.sub(this.pt1).scaleBy(t));
    }

    distToPoint(pt) {
        return pt.distanceTo(this.projectedPoint(pt));
    }

    draw(ctx) {
        if (this.hovered) {
            drawLine(ctx, this.pt1, this.pt2, COLOR.gray50, 3);
            drawCircle(ctx, this.pt1, 3, COLOR.gray50);
            drawCircle(ctx, this.pt2, 3, COLOR.gray50);
        } else {
            drawLine(ctx, this.pt1, this.pt2, COLOR.black, 1);
        }
        if (this.hoveredPt != null) {
            drawCircle(ctx, this.hoveredPt, 6, COLOR.gray50);
        }
    }

}






class Simulation {
    
    constructor(config, canvas, ctx, walls=[]) {
        this.config = config;
        this.canvas = canvas;
        this.ctx = ctx;
        this.walls = walls;
        this.canvas.width = this.config.simWidth;
        this.canvas.height = this.config.simHeight;
        this.running = false;
        this.balls = [];
        this.deadBalls = [];
        this.timer = 0;
        this.statusCounts = {
            [Ball.STATUS.good]: this.config.popSize - this.config.infectedAtStart,
            [Ball.STATUS.infected]: this.config.infectedAtStart,
            [Ball.STATUS.recovered]: 0,
            [Ball.STATUS.dead]: 0
        }
        this.createPopulation();
        this.addingWall = false;
        this.removingWall = false;
        this.mousePosPrev = new Vec2(0, 0);
        this.mousePos = new Vec2(0, 0);
        this.halfWallPoint = null;
        this.wallDistThresh = 10;
        this.wallPointDistThresh = 10;
        this.hoveredWall = {wall: null, pt: null};
        this.controlledWall = null;
    }

    createPopulation() {
        for (let i = 0; i < this.config.popSize; i++) {
            let pos = new Vec2(
                Math.random() * this.config.simWidth,
                Math.random() * this.config.simHeight
            );
            let vel = new Vec2(
                Math.random() - 0.5,
                Math.random() - 0.5
            ).scaleTo(this.config.speed);
            this.balls.push(new Ball(pos, vel, this.config.radius, Ball.STATUS.good, this.config.simWidth, this.config.simHeight));
        }
        for (let i = 0; i < this.config.infectedAtStart; i++) {
            this.balls[i].status = Ball.STATUS.infected;
        }
    }

    mouseMove(evt) {
        this.mousePosPrev.set(this.mousePos.x, this.mousePos.y);
        this.mousePos.set(evt.offsetX, evt.offsetY);
        this.hoveredWall = this.getHoveredWall();
        if (this.controlledWall != null) {
            this.moveControlledWall();
        }
    }

    mouseDown(evt) {
        if (evt.button == 0) {
            if (this.addingWall) {
                if (this.halfWallPoint == null) {
                    this.halfWallPoint = this.mousePos.copy();
                } else {
                    this.addWall(this.halfWallPoint, this.mousePos.copy());
                    this.halfWallPoint = null;
                }
            } else if (this.removingWall) {
                if (this.hoveredWall.wall != null) {
                    this.removeWall(this.hoveredWall.wall);
                }
            } else if (this.hoveredWall.wall != null) {
                this.controlledWall = this.hoveredWall;
            }
        }
    }

    mouseUp(evt) {
        if (evt.button == 0) {
            this.controlledWall = null;
        }
    }

    setAddingWall(adding) {
        this.addingWall = adding;
        if (!this.addingWall) {
            this.halfWallPoint = null;
        }
    }

    setRemovingWall(removing) {
        this.removingWall = removing;
    }

    moveControlledWall() {
        if (this.controlledWall.pt != null) {
            this.controlledWall.pt.set(this.mousePos.x, this.mousePos.y);
            this.controlledWall.wall.calcNormal();
        } else {
            let deltaMousePos = this.mousePos.sub(this.mousePosPrev);
            this.controlledWall.wall.pt1 = this.controlledWall.wall.pt1.add(deltaMousePos);
            this.controlledWall.wall.pt2 = this.controlledWall.wall.pt2.add(deltaMousePos);
        }
    }

    addWall(pt1, pt2) {
        this.walls.push(new Wall(pt1, pt2));
    }

    removeWall(wall) {
        let i = this.walls.indexOf(wall);
        if (i != -1) {
            this.walls.splice(i, 1);
        }
    }

    removeAllWalls() {
        this.walls = [];
    }

    getHoveredWall() {
        let hoveredWall = {wall: null, pt: null}
        for (let wall of this.walls) {
            if (wall.distToPoint(this.mousePos) < this.wallDistThresh) {
                hoveredWall.wall = wall;
                let pt1Dist = wall.pt1.distanceTo(this.mousePos);
                let pt2Dist = wall.pt2.distanceTo(this.mousePos);
                if (pt1Dist < this.wallPointDistThresh && pt1Dist < pt2Dist) {
                    hoveredWall.pt = wall.pt1;
                } else if (pt2Dist < this.wallPointDistThresh && pt2Dist < pt1Dist) {
                    hoveredWall.pt = wall.pt2;
                }
                break;
            }
        }
        return hoveredWall;
    }

    start() {
        if (!this.complete()) {
            this.running = true;
        }
    }

    pause() {
        this.running = false;
    }

    getStatusCounts() {
        return {
            [Ball.STATUS.good]: this.statusCounts[Ball.STATUS.good],
            [Ball.STATUS.infected]: this.statusCounts[Ball.STATUS.infected],
            [Ball.STATUS.recovered]: this.statusCounts[Ball.STATUS.recovered],
            [Ball.STATUS.dead]: this.statusCounts[Ball.STATUS.dead]
        };
    }

    radiusChanged(radius) {
        for (let ball of this.balls) {
            ball.radius = radius;
        }
        for (let deadBall of this.deadBalls) {
            deadBall.radius = radius;
        }
    }

    speedChanged(speed) {
        let speedScalar = speed / this.config.speed;
        for (let ball of this.balls) {
            ball.vel = ball.vel.scaleBy(speedScalar);
        }
    }

    getCollisions() {
        let collisions = [];
        for (let i1 = 0; i1 < this.balls.length; i1++) {
            let ball1 = this.balls[i1];
            for (let i2 = i1+1; i2 < this.balls.length; i2++) {
                let ball2 = this.balls[i2];
                if (ball1.collidesWith(ball2)) {
                    collisions.push([ball1, ball2]);
                }
            }
        }
        return collisions;
    }

    getWallCollisions() {
        let collisions = {wallCollision: [], endpointCollision: []};
        for (let ball of this.balls) {
            for (let wall of this.walls) {
                
                let prevProjPt = wall.projectedPoint(ball.prevPos);
                let curProjPt = wall.projectedPoint(ball.pos);

                let prevProjPtToPrevPos = ball.prevPos.sub(prevProjPt);
                let curProjPtToPos = ball.pos.sub(curProjPt);

                let wallEndpoint = null;
                if (prevProjPt.isVerySimilarTo(wall.pt1)) {
                    wallEndpoint = wall.pt1;
                } else if (prevProjPt.isVerySimilarTo(wall.pt2)) {
                    wallEndpoint = wall.pt2;
                }

                if (wallEndpoint != null && wallEndpoint.sub(ball.pos).magnitude() < ball.radius) {
                    collisions.endpointCollision.push([ball, wallEndpoint]);
                } else if (curProjPtToPos.magnitude() < ball.radius) {
                    collisions.wallCollision.push([ball, wall]);
                }
            }
        }
        return collisions;
    }

    bounceWallEndpoint(ball, endpoint) {
        let endpointToPos = ball.pos.sub(endpoint);
        endpointToPos = endpointToPos.scaleTo(ball.radius - endpointToPos.magnitude());
        ball.prevPos = ball.pos;
        ball.pos = ball.pos.add(endpointToPos);
        let fakeNormal = ball.pos.sub(endpoint).normalize();
        let blah = fakeNormal.scaleBy(2 * fakeNormal.dot(ball.vel));
        ball.vel = ball.vel.sub(blah);
    }

    bounceWall(ball, wall) {
        let prevProjPt = wall.projectedPoint(ball.prevPos);
        let curProjPt = wall.projectedPoint(ball.pos);
        let A = prevProjPt.sub(curProjPt).magnitude();
        let D = ball.prevPos.sub(ball.pos).magnitude();
        let theta = Math.acos(A / D);
        let f = curProjPt.sub(ball.pos).magnitude();
        let b;
        if (ball.prevPos.sub(prevProjPt).dot(ball.pos.sub(curProjPt)) >= 0) {
            b = ball.radius - f;
        } else {
            b = ball.radius + f;
        }
        let d = b / Math.sin(theta);
        ball.prevPos = ball.pos;
        ball.pos = ball.pos.add(ball.vel.scaleTo(-d));
        let blah = wall.normal.scaleBy(2 * wall.normal.dot(ball.vel));
        ball.vel = ball.vel.sub(blah);
    }

    moveApart(ball1, ball2) {
        let vec1 = ball1.pos.sub(ball2.pos);
        vec1 = vec1.scaleTo((ball1.radius + ball2.radius - vec1.magnitude()) / 2);
        let vec2 = vec1.scaleBy(-1);
        ball1.prevPos = ball1.pos;
        ball2.prevPos = ball2.pos;
        ball1.pos = ball1.pos.add(vec1);
        ball2.pos = ball2.pos.add(vec2);
    }

    bounce(ball1, ball2) {
        let dir12 = ball2.pos.sub(ball1.pos)
        let dir21 = ball1.pos.sub(ball2.pos)
        let scalar = ball1.vel.sub(ball2.vel).dot(dir21) / dir21.squaredMagnitude();
        ball1.vel = ball1.vel.sub(dir21.scaleBy(scalar));
        ball2.vel = ball2.vel.sub(dir12.scaleBy(scalar));
    }

    processWallCollisions(collisions) {
        for (let [ball, wall] of collisions.wallCollision) {
            this.bounceWall(ball, wall);
        }
        for (let [ball, endpoint] of collisions.endpointCollision) {
            this.bounceWallEndpoint(ball, endpoint);
        }
    }

    processCollisions(collisions) {
        for (let [ball1, ball2] of collisions) {
            this.moveApart(ball1, ball2);
            this.bounce(ball1, ball2);
        }
    }

    checkTransmissions(collisions) {
        for (let balls of collisions) {
            let ball1 = balls[0];
            let ball2 = balls[1];
            if (ball1.status == Ball.STATUS.infected && ball2.status == Ball.STATUS.good) {
                if (Math.random() < this.config.transmissionRate) {
                    ball2.status = Ball.STATUS.infected;
                    this.statusCounts[Ball.STATUS.infected]++;
                    this.statusCounts[Ball.STATUS.good]--;
                    this.statusCountsChanged = true;
                }
            } else if (ball2.status == Ball.STATUS.infected && ball1.status == Ball.STATUS.good) {
                if (Math.random() < this.config.transmissionRate) {
                    ball1.status = Ball.STATUS.infected;
                    this.statusCounts[Ball.STATUS.infected]++;
                    this.statusCounts[Ball.STATUS.good]--;
                    this.statusCountsChanged = true;
                }
            }
        }
    }

    checkInfectionDurations() {
        for (let ball of this.balls) {
            if (ball.infectionTimer >= this.config.infectionDuration) {
                ball.infectionTimer = 0;
                if (Math.random() < this.config.deathRate) {
                    ball.status = Ball.STATUS.dead;
                    this.statusCounts[Ball.STATUS.dead]++;
                    this.statusCounts[Ball.STATUS.infected]--;
                    this.statusCountsChanged = true;
                } else {
                    ball.status = Ball.STATUS.recovered;
                    this.statusCounts[Ball.STATUS.recovered]++;
                    this.statusCounts[Ball.STATUS.infected]--;
                    this.statusCountsChanged = true;
                }
            }
        }
    }

    removeDead() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            if (this.balls[i].status == Ball.STATUS.dead) {
                this.deadBalls.push(this.balls.splice(i, 1)[0]);
            }
        }
    }

    complete() {
        return this.statusCounts[Ball.STATUS.infected] == 0;
    }

    updateAlways() {
        for (let wall of this.walls) {
            wall.hovered = false;
            wall.hoveredPt = null;
        }
        if (this.hoveredWall.wall != null) {
            this.hoveredWall.wall.hovered = true;
            if (this.hoveredWall.pt != null) {
                this.hoveredWall.wall.hoveredPt = this.hoveredWall.pt;
            }
        }
    }

    updateRunning() {
        for (let ball of this.balls) {
            ball.update(this.config.simWidth, this.config.simHeight);
        }
        this.processWallCollisions(this.getWallCollisions());
        let collisions = this.getCollisions();
        this.processCollisions(collisions);
        this.checkTransmissions(collisions);
        this.checkInfectionDurations();
        this.removeDead();
        this.timer++;
    }

    update() {
        this.updateAlways();
        if (this.running) {
            this.updateRunning();
        }
    }

    draw() {
        this.ctx.fillStyle = COLOR.canvasBackground;
        this.ctx.fillRect(0, 0, this.config.simWidth, this.config.simHeight);
        for (let dead of this.deadBalls) {
            dead.draw(this.ctx);
        }
        for (let ball of this.balls) {
            ball.draw(this.ctx);
        }
        for (let wall of this.walls) {
            wall.draw(this.ctx);
        }
        if (this.addingWall) {
            drawCircle(this.ctx, this.mousePos, 5, COLOR.blue);
        }
        if (this.halfWallPoint != null) {
            drawCircle(this.ctx, this.halfWallPoint, 5, COLOR.blue);
        }
    }

}






class SimulationChart {

    constructor(config, canvas, ctx) {
        this.config = config;
        this.canvas = canvas;
        this.ctx = ctx;
        this.popSize = this.config.popSize;
        this.canvas.width = this.config.chartWidth;
        this.canvas.height = this.config.chartHeight;
        this.chartData = [];
        this.statusDrawOrder = [Ball.STATUS.good, Ball.STATUS.recovered, Ball.STATUS.infected, Ball.STATUS.dead];
    }

    addData(data) {
        this.chartData.push(data);
    }

    draw() {
        let heightPerMember = this.config.chartHeight / this.popSize;
        if (this.chartData.length == 1) {
            let y = this.chartData[0][0][Ball.STATUS.good] * heightPerMember;
            drawRect(this.ctx, 0, 0, this.config.chartWidth, y, Ball.STATUS_COLORS[Ball.STATUS.good]);
            drawRect(this.ctx, 0, y, this.config.chartWidth, this.config.chartHeight - y, Ball.STATUS_COLORS[Ball.STATUS.infected]);
        } else {
            let totalTime = this.chartData[this.chartData.length - 1][1];
            let widthPerUnitTime = this.config.chartWidth / totalTime;            
            let heights = new Array(this.chartData.length).fill(0);
            let xs = [];
            for (let i = 0; i < this.chartData.length; i++) {
                xs.push(this.chartData[i][1] * widthPerUnitTime);
            }
            for (let status of this.statusDrawOrder) {
                this.ctx.fillStyle = Ball.STATUS_COLORS[status];
                this.ctx.beginPath();
                this.ctx.moveTo(xs[0], heights[0]);
                for (let i = 1; i < xs.length; i++) {
                    this.ctx.lineTo(xs[i], heights[i]);
                }
                for (let i = xs.length-1; i >= 0; i--) {
                    heights[i] += this.chartData[i][0][status] * heightPerMember;
                    this.ctx.lineTo(xs[i], heights[i]);
                }
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }
}






class Main {

    constructor(simConfig, htmlConfig) {
        this.config = simConfig;
        this.htmlConfig = htmlConfig;
        this.simCanvas = document.getElementById(this.htmlConfig.canvas.simId);
        this.simCtx = this.simCanvas.getContext("2d");
        this.chartCanvas = document.getElementById(this.htmlConfig.canvas.chartId);
        this.chartCtx = this.chartCanvas.getContext("2d");
        this.sim = null;
        this.chart = null;
        this.setHtml();
        this.setHandlers();
        this.createNewSimulation();
    }

    setHtml() {
        for (let inputData of Object.values(this.htmlConfig.inputs)) {
            $(`#${inputData.minId}`).text(inputData.min);
            $(`#${inputData.maxId}`).text(inputData.max);
            $(`#${inputData.valueId}`).text(inputData.startingValue);
            $(`#${inputData.inputId}`).attr("min", inputData.min);
            $(`#${inputData.inputId}`).attr("max", inputData.max);
            $(`#${inputData.inputId}`).val(inputData.startingValue);
        }
    }

    setHandlers() {
        let inputs = this.htmlConfig.inputs;
        let buttons = this.htmlConfig.buttons;
        $(this.simCanvas).mousedown(this.mouseDown.bind(this));
        $(this.simCanvas).mouseup(this.mouseUp.bind(this));
        $(this.simCanvas).mousemove(this.mouseMove.bind(this));
        $(`#${buttons.startId}`).click(this.startHandler.bind(this));
        $(`#${buttons.pauseId}`).click(this.pauseHandler.bind(this));
        $(`#${buttons.resetId}`).click(this.resetHandler.bind(this));
        $(`#${buttons.addWallId}`).click(this.addWallHandler.bind(this));
        $(`#${buttons.removeWallId}`).click(this.removeWallHandler.bind(this));
        $(`#${buttons.removeAllWallsId}`).click(this.removeAllWallsHandler.bind(this));
        $(`#${inputs.popSize.inputId}`).on('input change', this.popSizeChanged.bind(this));
        $(`#${inputs.infectedAtStart.inputId}`).on('input change', this.infectedAtStartChanged.bind(this));
        $(`#${inputs.infectionDuration.inputId}`).on('input', this.infectionDurationChanged.bind(this));
        $(`#${inputs.transmissionRate.inputId}`).on('input', this.transmissionRateChanged.bind(this));
        $(`#${inputs.deathRate.inputId}`).on('input', this.deathRateChanged.bind(this));
        $(`#${inputs.radius.inputId}`).on('input change', this.radiusChanged.bind(this));
        $(`#${inputs.speed.inputId}`).on('input change', this.speedChanged.bind(this));
    }

    setStatusCounts() {
        $(`#${this.htmlConfig.statusCounts.goodId}`).text(this.sim.statusCounts[Ball.STATUS.good]);
        $(`#${this.htmlConfig.statusCounts.infectedId}`).text(this.sim.statusCounts[Ball.STATUS.infected]);
        $(`#${this.htmlConfig.statusCounts.recoveredId}`).text(this.sim.statusCounts[Ball.STATUS.recovered]);
        $(`#${this.htmlConfig.statusCounts.deadId}`).text(this.sim.statusCounts[Ball.STATUS.dead]);
    }
    
    createNewSimulation() {
        let walls = this.sim != null ? this.sim.walls : this.createStartingWalls();
        this.sim = new Simulation(this.config, this.simCanvas, this.simCtx, walls);
        this.chart = new SimulationChart(this.config, this.chartCanvas, this.chartCtx);
        this.addChartData();
        this.setStatusCounts();
        this.setTimer();
    }

    createStartingWalls() {
        let walls = [];
        let gap = 30;
        let wallLength = this.config.simHeight / 2 - gap / 2;
        walls.push(new Wall(
            new Vec2(this.config.simWidth / 3, 0),
            new Vec2(this.config.simWidth / 3, wallLength)
        ));
        walls.push(new Wall(
            new Vec2(this.config.simWidth / 3, wallLength + gap),
            new Vec2(this.config.simWidth / 3, this.config.simHeight)
        ));
        return walls;
    }

    startHandler() {
        if (!this.sim.complete()) {
            this.sim.start();
            $(`#${this.htmlConfig.canvas.simId}`).css("border-color", COLOR.canvasRunningBorder);
            $(`#${this.htmlConfig.canvas.chartId}`).css("border-color", COLOR.canvasRunningBorder);
            $(`#${this.htmlConfig.buttons.startId}`).addClass("btn_active");
            $(`#${this.htmlConfig.buttons.pauseId}`).removeClass("btn_active");
        }
    }

    pauseHandler() {
        this.sim.pause();
        $(`#${this.htmlConfig.canvas.simId}`).css("border-color", COLOR.canvasPausedBorder);
        $(`#${this.htmlConfig.canvas.chartId}`).css("border-color", COLOR.canvasPausedBorder);
        $(`#${this.htmlConfig.buttons.startId}`).removeClass("btn_active");
        $(`#${this.htmlConfig.buttons.pauseId}`).addClass("btn_active");
    }

    resetHandler() {
        this.pauseHandler();
        if (this.sim.addingWall) {
            this.addWallHandler();
        } else if (this.sim.removingWall) {
            this.removeWallHandler();
        }
        this.createNewSimulation();
    }

    addWallHandler(evt) {
        if (this.sim.removingWall) {
            this.removeWallHandler();
        }
        if ($(`#${this.htmlConfig.buttons.addWallId}`).hasClass("btn_active")) {
            $(`#${this.htmlConfig.buttons.addWallId}`).removeClass("btn_active");
            $(`#${this.htmlConfig.canvas.simId}`).css("cursor", "pointer");
            this.sim.setAddingWall(false);
        } else {
            $(`#${this.htmlConfig.buttons.addWallId}`).addClass("btn_active");
            $(`#${this.htmlConfig.canvas.simId}`).css("cursor", "none");
            this.sim.setAddingWall(true);
        }
    }

    removeWallHandler(evt) {
        if (this.sim.addingWall) {
            this.addWallHandler();
        }
        if ($(`#${this.htmlConfig.buttons.removeWallId}`).hasClass("btn_active")) {
            $(`#${this.htmlConfig.buttons.removeWallId}`).removeClass("btn_active");
            this.sim.setRemovingWall(false);
        } else {
            $(`#${this.htmlConfig.buttons.removeWallId}`).addClass("btn_active");
            this.sim.setRemovingWall(true);
        }
    }

    removeAllWallsHandler(evt) {
        this.sim.removeAllWalls();
    }

    popSizeChanged(evt) {
        let popSizeInput = this.htmlConfig.inputs.popSize;
        let infectedAtStartInput = this.htmlConfig.inputs.infectedAtStart;
        let newPopSize = Number(evt.target.value);
        $(`#${popSizeInput.valueId}`).text(newPopSize);
        $(`#${infectedAtStartInput.maxId}`).text(newPopSize);
        $(`#${infectedAtStartInput.inputId}`).attr("max", newPopSize);
        if (newPopSize < this.config.infectedAtStart) {
            this.config.infectedAtStart = newPopSize;
            $(`#${infectedAtStartInput.valueId}`).text(newPopSize);
        }
        this.config.popSize = newPopSize;
        if (!this.sim.running && evt.type == "change") {
            this.createNewSimulation();
        }
    }

    infectedAtStartChanged(evt) {
        let newInfectedAtStart = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.infectedAtStart.valueId}`).text(newInfectedAtStart);
        this.config.infectedAtStart = newInfectedAtStart;
        if (!this.sim.running && evt.type == "change") {
            this.resetHandler();
        }
    }

    infectionDurationChanged(evt) {
        let newDuration = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.infectionDuration.valueId}`).text(newDuration);
        this.config.infectionDuration = newDuration * this.config.fps;
    }

    transmissionRateChanged(evt) {
        let newRate = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.transmissionRate.valueId}`).text(newRate);
        this.config.transmissionRate = newRate / 100;
    }

    deathRateChanged(evt) {
        let newRate = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.deathRate.valueId}`).text(newRate);
        this.config.deathRate = newRate / 100;
    }

    speedChanged(evt) {
        let speed = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.speed.valueId}`).text(speed);
        if (evt.type == "change") {
            let newSpeed = speed / 5;
            this.sim.speedChanged(newSpeed);
            this.config.speed = newSpeed;
        }
    }

    radiusChanged(evt) {
        let newRadius = Number(evt.target.value);
        $(`#${this.htmlConfig.inputs.radius.valueId}`).text(newRadius);
        if (evt.type == "change") {
            this.sim.radiusChanged(newRadius);
            this.config.radius = newRadius;
        }
        this.sim.draw();
    }

    mouseDown(evt) {
        this.sim.mouseDown(evt);
    }

    mouseUp(evt) {
        this.sim.mouseUp(evt);
    }

    mouseMove(evt) {
        this.sim.mouseMove(evt);
    }

    addChartData() {
        let counts = [this.sim.getStatusCounts(), this.sim.timer];
        this.chart.addData(counts);
    }

    setTimer() {
        let time = this.sim.timer / 30;
        $("#sim_timer").text(time.toFixed(1));
    }

    loop() {
        this.sim.update();
        if (this.sim.running) {
            if (this.sim.statusCountsChanged) {
                this.setStatusCounts();
                this.addChartData();
                this.sim.statusCountsChanged = false;
            }
            if (this.sim.complete()) {
                this.sim.pause();
                this.pauseHandler();
            }
            this.setTimer();
        }
        this.chart.draw();
        this.sim.draw();
    }
}




document.addEventListener("DOMContentLoaded", function() {

    let simConfig = {
        simWidth: 600,
        simHeight: 400,
        chartWidth: 600,
        chartHeight: 400,
        popSize: 100,
        infectedAtStart: 1,
        infectionDuration: 15 * 30,
        transmissionRate: 0.75,
        deathRate: 0.15,
        speed: 5 / 5,
        radius: 5,
        fps: 30
    };

    let htmlConfig = {
        canvas: {
            simId: "sim_canvas",
            chartId: "chart_canvas"
        },
        statusCounts: {
            goodId: "qnt_good",
            infectedId: "qnt_infected",
            recoveredId: "qnt_recovered",
            deadId: "qnt_dead"
        },
        buttons: {
            startId: "start_simlation",
            pauseId: "pause_simlation",
            resetId: "reset_simulation",
            addWallId: "add_wall",
            removeWallId: "remove_wall",
            removeAllWallsId: "remove_all_walls"
        },
        inputs: {
            popSize: {
                inputId: "pop_size",
                valueId: "pop_size_val",
                minId: "pop_size_min",
                maxId: "pop_size_max",
                min: 1,
                max: 300,
                startingValue: simConfig.popSize
            },
            infectedAtStart: {
                inputId: "infected_at_start",
                valueId: "infected_at_start_val",
                minId: "infected_at_start_min",
                maxId: "infected_at_start_max",
                min: 1,
                max: simConfig.popSize,
                startingValue: simConfig.infectedAtStart
            },
            infectionDuration: {
                inputId: "infection_duration",
                valueId: "infection_duration_val",
                minId: "infection_duration_min",
                maxId: "infection_duration_max",
                min: 1,
                max: 30,
                startingValue: simConfig.infectionDuration / simConfig.fps
            },
            transmissionRate: {
                inputId: "transmission_rate",
                valueId: "transmission_rate_val",
                minId: "transmission_rate_min",
                maxId: "transmission_rate_max",
                min: 0,
                max: 100,
                startingValue: simConfig.transmissionRate * 100
            },
            deathRate: {
                inputId: "death_rate",
                valueId: "death_rate_val",
                minId: "death_rate_min",
                maxId: "death_rate_max",
                min: 0,
                max: 100,
                startingValue: simConfig.deathRate * 100
            },
            speed: {
                inputId: "speed",
                valueId: "speed_val",
                minId: "speed_min",
                maxId: "speed_max",
                min: 1,
                max: 15,
                startingValue: simConfig.speed * 5
            },
            radius: {
                inputId: "radius",
                valueId: "radius_val",
                minId: "radius_min",
                maxId: "radius_max",
                min: 3,
                max: 50,
                startingValue: simConfig.radius
            }
        }
    };

    let main = new Main(simConfig, htmlConfig);
    setInterval(main.loop.bind(main), 1000 / simConfig.fps);
});





const BACKGROUND = "#dddddd";
const RED = "#dd3333";
const GREEN = "#33dd33";
const BLUE = "#0000ff";
const DARK_GREEN = "#337733";
const WHITE = "#fafafa";
const BLACK = "#000000";
const GRAY = "#777777";
const SIM_WIDTH = 600;
const SIM_HEIGHT = 400;
const CHART_WIDTH = 600;
const CHART_HEIGHT = 400;
const FPS = 30;





function getRandFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function draw_line(ctx, p1, p2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function draw_circle(ctx, center, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

function draw_rect(ctx, x, y, w, h, color) {
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
        if (x instanceof Vec2) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    static random(min=0, max=1) {
        return new Vec2(getRandFloat(min, max), getRandFloat(min, max));
    }

    static add(v1, v2) {
        if (v1 instanceof Vec2 && v2 instanceof Vec2) {
            return new Vec2(v1.x + v2.x, v1.y + v2.y);
        } else {
            return new Vec2(v1.x + v2, v1.y + v2);
        }
    }

    static sub(v1, v2) {
        if (v1 instanceof Vec2 && v2 instanceof Vec2) {
            return new Vec2(v1.x - v2.x, v1.y - v2.y);
        } else {
            return new Vec2(v1.x - v2, v1.y - v2);
        }
    }

    static mult(v1, v2) {
        if (v1 instanceof Vec2 && v2 instanceof Vec2) {
            return new Vec2(v1.x * v2.x, v1.y * v2.y);
        } else {
            return new Vec2(v1.x * v2, v1.y * v2);
        }
    }

    set(x, y) {
        if (x instanceof Vec2) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    add(other) {
        if (other instanceof Vec2) {
            this.x += other.x;
            this.y += other.y;
        } else {
            this.x += other;
            this.y += other;
        }
    }

    sub(other) {
        if (other instanceof Vec2) {
            this.x -= other.x;
            this.y -= other.y;
        } else {
            this.x -= other;
            this.y -= other;
        }
    }

    mult(other) {
        if (other instanceof Vec2) {
            this.x *= other.x;
            this.y *= other.y;
        } else {
            this.x *= other;
            this.y *= other;
        }
    }

    distance(other) {
        return Math.sqrt(Math.pow((this.x-other.x), 2) + Math.pow((this.y-other.y), 2));
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    mag_squared() {
        return this.x * this.x + this.y * this.y;
    }

    scale_to(length) {
        this.mult(length / this.mag());
    }

    normalize() {
        let m = this.mag();
        this.x /= m;
        this.y /= m;
    }

    equals(other) {
        return this.x == other.x && this.y == other.y;
    }
}







class Wall {

    constructor(main, p1, p2) {
        this.main = main;
        this.p1 = new Vec2(p1);
        this.p2 = new Vec2(p2);
        this.color = BLACK;
        this.end_r = 6;
        this.mouse_on_p1 = false;
        this.mouse_on_p2 = false;
        this.calc_perp();
    }

    calc_perp() {
        this.perp_slope = -(this.p1.x - this.p2.x) / (this.p1.y - this.p2.y);
        this.y_inter1 = (this.p1.y - this.p1.x * this.perp_slope);
        this.y_inter2 = (this.p2.y - this.p2.x * this.perp_slope);
        this.normal = new Vec2(-(this.p1.y - this.p2.y), (this.p1.x - this.p2.x));
        this.normal.normalize();
    }

    distance_to(vec) {
        let num1 = (this.p2.y - this.p1.y) * vec.x;
        let num2 = (this.p2.x - this.p1.x) * vec.y;
        let num3 = this.p2.x * this.p1.y - this.p2.y * this.p1.x;
        let num = num1 - num2 + num3;
        let den1 = (this.p2.y - this.p1.y) ** 2;
        let den2 = (this.p2.x - this.p1.x) ** 2;
        let den = Math.sqrt(den1 + den2);
        return num / den;
    }

    mouse_on() {
        if (this.main.mouse.distance(this.p1) < this.main.rem_wall_dist_thresh) {
            this.mouse_on_p1 = true;
            return this.p1;
        }
        if (this.main.mouse.distance(this.p2) < this.main.rem_wall_dist_thresh) {
            this.mouse_on_p2 = true;
            return this.p2;
        }
        return null;
    }

    update() {
        this.mouse_on_p1 = this.main.mouse.distance(this.p1) < this.main.mouse_dist_thresh;
        this.mouse_on_p2 = this.main.mouse.distance(this.p2) < this.main.mouse_dist_thresh;
    }

    draw() {
        draw_line(this.main.sim_ctx, this.p1, this.p2, this.color);
        if (this.mouse_on_p1) {
            draw_circle(this.main.sim_ctx, this.p1, this.end_r, GREEN);
            draw_circle(this.main.sim_ctx, this.p1, this.end_r/2, DARK_GREEN);
        } else if (this.mouse_on_p2) {
            draw_circle(this.main.sim_ctx, this.p2, this.end_r, GREEN);
            draw_circle(this.main.sim_ctx, this.p2, this.end_r/2, DARK_GREEN);
        }
    }


}







class Ball {

    constructor(main, pos, vel, status, r=10, color="ffffff") {
        this.main = main;
        this.pos = pos;
        this.prev_pos = new Vec2(pos);
        this.vel = vel;
        this.r = r;
        this.mass = Math.PI * (this.r**2);
        this.color = color;
        this.check_edges = this.check_bounce_edges;
        this.status = status;
        this.inf_start = 0;
    }

    check_bounce_edges() {
        if (this.pos.x + this.r > SIM_WIDTH) {
            this.pos.x = SIM_WIDTH - this.r
            this.vel.x *= -1
        } else if (this.pos.x - this.r < 0) {
            this.pos.x = this.r
            this.vel.x *= -1
        }
        if (this.pos.y + this.r > SIM_HEIGHT) {
            this.pos.y = SIM_HEIGHT - this.r
            this.vel.y *= -1
        } else if (this.pos.y - this.r < 0) {
            this.pos.y = this.r
            this.vel.y *= -1
        }
    }

    check_wrap_edges() {
        if (this.pos.x - this.r > SIM_WIDTH) {
            this.pos.x = -this.r
        } else if (this.pos.x + this.r < 0) {
            this.pos.x = SIM_WIDTH + this.r
        }
        if (this.pos.y - this.r > SIM_HEIGHT) {
            this.pos.y = -this.r
        } else if (this.pos.y + this.r < 0) {
            this.pos.y = SIM_HEIGHT + this.r
        }
    }

    check_walls() {
        for (let wall of this.main.walls) {
            let prev_dist = wall.distance_to(this.prev_pos);
            let curr_dist = wall.distance_to(this.pos);
            if ((prev_dist + this.r <= 0 && curr_dist + this.r > 0) || (curr_dist - this.r <= 0 && prev_dist - this.r > 0)) {
                let yone = this.pos.x * wall.perp_slope + wall.y_inter1;
                let ytwo = this.pos.x * wall.perp_slope + wall.y_inter2;
                if (yone < this.pos.y) {
                    if (ytwo > this.pos.y) {
                        this.bounce_wall(wall);
                        break;
                    }
                } else if (ytwo < this.pos.y) {
                    this.bounce_wall(wall);
                    break;
                }
            }
        }
    }

    bounce_wall(wall) {
        this.pos.sub(this.vel);
        this.vel.set(Vec2.sub(this.vel, Vec2.mult(wall.normal, 2 * wall.normal.dot(this.vel))));
    }

    check_collisions() {
        for (let ball of this.main.balls) {
            if (ball != this && ball.status != Main.Status.DEAD && this.collision(ball)) {
                this.move_apart(ball);
                this.bounce(ball);
                this.check_infection(ball);
                break;
            }
        }
    }

    collision(other) {
        let dist = this.pos.distance(other.pos);
        return dist <= this.r + other.r;
    }

    move_apart(other) {
        let vec = Vec2.sub(this.pos, other.pos);
        vec.scale_to((this.r + other.r - vec.mag()) / 2);
        this.pos.add(vec);
        vec.mult(-1);
        other.pos.add(vec);
    }

    bounce(other) {
        let mag_sq = Vec2.sub(this.pos, other.pos).mag_squared();
        let d = Vec2.sub(this.vel, other.vel).dot(Vec2.sub(this.pos, other.pos));
        let dv1 = Vec2.sub(this.pos, other.pos);
        let dv2 = Vec2.sub(other.pos, this.pos);
        dv1.mult(2 * other.mass / (this.mass + other.mass) * d / mag_sq);
        dv2.mult(2 * this.mass / (this.mass + other.mass) * d / mag_sq);
        this.vel.sub(dv1);
        other.vel.sub(dv2);
    }

    check_infection(other) {
        if (this.status == Main.Status.INFECTED) {
            if (other.status == Main.Status.GOOD && Math.random() < this.main.inf_chance) {
                this.main.inc_infected();
                other.status = Main.Status.INFECTED;
                other.inf_start = this.main.time;
            }
        } else if (other.status == Main.Status.INFECTED && Math.random() < this.main.inf_chance) {
            if (this.status == Main.Status.GOOD) {
                this.main.inc_infected();
                this.status = Main.Status.INFECTED;
                this.inf_start = this.main.time;
            }
        }
    }

    check_status() {
        if (this.status == Main.Status.INFECTED) {
            let inf_age = this.main.time - this.inf_start;
            if (inf_age >= this.main.inf_duration) {
                if (Math.random() < this.main.death_rate) {
                    this.main.inc_dead();
                    this.status = Main.Status.DEAD;
                } else {
                    this.main.inc_recovered();
                    this.status = Main.Status.RECOVERD;
                }
            }
        }
    }

    update() {
        if (this.status != Main.Status.DEAD) {
            this.prev_pos.set(this.pos);
            this.pos.add(this.vel);
            this.check_edges();
            this.check_collisions();
            this.check_walls();
            this.check_status();
        }
    }

    draw() {
        draw_circle(this.main.sim_ctx, this.pos, this.r, Main.StatusColors[this.status]);
    }

}







class Main {

    constructor(sim_ctx, chart_ctx) {
        this.sim_ctx = sim_ctx;
        this.chart_ctx = chart_ctx;
        this.pop_size = 150;
        this.ball_radius = 5;
        this.start_infected = 50;
        this.inf_chance = 0;
        this.inf_duration = 30;
        this.death_rate = 0.5;
        this.speed = 1;
        this.walls = [];
        this.adding_wall = false;
        this.removing_wall = false;
        this.add_wall_pt = null;
        this.running = false;
        this.mouse = new Vec2();
        this.mouse_dist_thresh = 10;
        this.rem_wall_dist_thresh = 10;
        this.status_qnts = [this.pop_size - this.start_infected, 0, this.start_infected, 0];
        this.status_changed = false;
        this.time = 0;
        this.chart_data = [[this.status_qnts.slice(), this.time]];
        this.create_population();
        this.create_start_walls();
        this.set_starting_vals();
        this.set_status_quantities();
        this.draw_chart();
    }

    create_population() {
        this.balls = [];
        for (let i = 0; i < this.pop_size; i++) {
            let pos = new Vec2(getRandInt(0, SIM_WIDTH), getRandInt(0, SIM_HEIGHT));
            let vel = Vec2.random(-1, 1);
            vel.scale_to(getRandFloat(0, this.speed));
            this.balls.push(new Ball(this, pos, vel, Main.Status.GOOD, this.ball_radius));
        }
        for (let i = 0; i < Math.min(this.start_infected, this.pop_size); i++) {
            this.balls[i].status = Main.Status.INFECTED;
        }
    }

    create_start_walls() {
        let gap = 30;
        this.walls = [
            new Wall(this, new Vec2(SIM_WIDTH/3, 0), new Vec2(SIM_WIDTH/3, SIM_HEIGHT/2-gap/2)),
            new Wall(this, new Vec2(SIM_WIDTH/3, SIM_HEIGHT/2+gap/2), new Vec2(SIM_WIDTH/3, SIM_HEIGHT))
        ];
    }

    set_starting_vals() {
        $("#pop_size").val(this.pop_size);
        $("#pop_size_val").text(this.pop_size);
        $("#start_infected").val(this.start_infected);
        $("#start_infected_val").text(this.start_infected);
        $("#start_infected_max").text(this.pop_size);
        $("#start_infected").attr("max", this.pop_size);
        $("#ball_radius").val(this.ball_radius);
        $("#ball_radius_val").text(this.ball_radius);
        $("#speed").val(this.speed*5);
        $("#speed_val").text(this.speed*5);
        $("#inf_chance").val(this.inf_chance * 100);
        $("#inf_chance_val").text(this.inf_chance * 100);
        $("#inf_duration").val(this.inf_duration / FPS);
        $("#inf_duration_val").text(this.inf_duration / FPS);
        $("#death_rate").val(this.death_rate * 100);
        $("#death_rate_val").text(this.death_rate * 100);
        this.set_time();
    }

    set_status_quantities() {
        $("#qnt_good").text(this.status_qnts[Main.Status.GOOD]);
        $("#qnt_infected").text(this.status_qnts[Main.Status.INFECTED]);
        $("#qnt_recovered").text(this.status_qnts[Main.Status.RECOVERD]);
        $("#qnt_dead").text(this.status_qnts[Main.Status.DEAD]);
    }

    set_time() {
        $("#sim_time").text((this.time/FPS).toFixed(1));
    }

    inc_infected() {
        this.status_qnts[Main.Status.GOOD] -= 1;
        this.status_qnts[Main.Status.INFECTED] += 1;
        this.status_changed = true;
    }

    inc_recovered() {
        this.status_qnts[Main.Status.INFECTED] -= 1;
        this.status_qnts[Main.Status.RECOVERD] += 1;
        this.status_changed = true;
    }

    inc_dead() {
        this.status_qnts[Main.Status.INFECTED] -= 1;
        this.status_qnts[Main.Status.DEAD] += 1;
        this.status_changed = true;
    }

    reset_population() {
        this.create_population();
        this.status_qnts = [this.pop_size - this.start_infected, 0, this.start_infected, 0];
        this.time = 0;
        this.chart_data = [[this.status_qnts.slice(), this.time]];
        this.sim_done = false;
    }

    check_wall_ends() {
        for (let wall of this.walls) {
            this.controlled_pt = wall.mouse_on();
            if (this.controlled_pt) {
                this.controlled_wall = wall;
                break;
            }
        }
    }

    add_wall() {
        if (this.add_wall_pt) {
            if (!this.add_wall_pt.equals(this.mouse)) {
                this.walls.push(new Wall(this, this.add_wall_pt, this.mouse));
                this.add_wall_pt = null;
            }
        } else {
            this.add_wall_pt = new Vec2(this.mouse);
        }
    }

    remove_wall() {
        let short_d = SIM_WIDTH * 2;
        let closest = 0;
        for (let i = 0; i < this.walls.length; i++) {
            let n2 = this.walls[i].p1.distance(this.mouse);
            let n3 = this.walls[i].p2.distance(this.mouse);
            let wall_short = Math.min(n2, n3);
            if (wall_short < short_d) {
                short_d = wall_short;
                closest = i
            }
        }
        if (short_d < this.rem_wall_dist_thresh) {
            this.walls.splice(closest, 1);
        }
    }

    start() {
        if (!this.sim_done) {
            this.running = true;
            this.add_wall_pt = null;
            $("#sim_canvas").css("border-color", DARK_GREEN);
            $("#chart_canvas").css("border-color", DARK_GREEN);
            $("#start_simlation").addClass("btn_active");
            $("#pause_simlation").removeClass("btn_active");
        }
    }

    pause() {
        this.running = false;
        $("#sim_canvas").css("border-color", GRAY);
        $("#chart_canvas").css("border-color", GRAY);
        $("#start_simlation").removeClass("btn_active");
        $("#pause_simlation").addClass("btn_active");
    }

    add_wall_handler() {
        this.adding_wall = !this.adding_wall;
        this.removing_wall = false;
        $("#add_wall").toggleClass("btn_active");
        $("#remove_wall").removeClass("btn_active");
    }

    remove_wall_handler() {
        this.removing_wall = !this.removing_wall;
        this.adding_wall = false;
        $("#remove_wall").toggleClass("btn_active");
        $("#add_wall").removeClass("btn_active");
    }

    remove_all_walls_handler() {
        this.walls = [];
    }

    reset_handler() {
        this.pause();
        this.reset_population();
        this.set_status_quantities();
        this.draw_chart();
        this.set_time();
        this.sim_done = false;
    }

    pop_size_changed(evt) {
        this.pop_size = Number(evt.target.value);
        $("#pop_size_val").text(this.pop_size);
        $("#start_infected_max").text(this.pop_size);
        $("#start_infected").attr("max", this.pop_size);
        if (this.start_infected > this.pop_size) {
            this.start_infected = this.pop_size;
            $("#start_infected_val").text(this.start_infected);
        }
        if (!this.running && evt.type == "change") {
            this.reset_population();
            this.set_status_quantities();
        }
    }

    start_infected_changed(evt) {
        this.start_infected = Number(evt.target.value);
        $("#start_infected_val").text(this.start_infected);
        if (!this.running && evt.type == "change") {
            this.reset_population();
            this.set_status_quantities();
        }
    }

    radius_changed(evt) {
        this.ball_radius = Number(evt.target.value);
        if (evt.type == "change") {
            for (let ball of this.balls) {
                ball.r = this.ball_radius;
            }
        }
        $("#ball_radius_val").text(this.ball_radius);
    }

    speed_changed(evt) {
        let speed = Number(evt.target.value);
        if (evt.type == "change") {
            let prev_speed = this.speed;
            this.speed = speed / 5;
            for (let ball of this.balls) {
                ball.vel.scale_to(this.speed * ball.vel.mag() / prev_speed);
            }
        }
        $("#speed_val").text(speed);
    }

    infection_chance_changed(evt) {
        this.inf_chance = Number(evt.target.value) / 100;
        $("#inf_chance_val").text(evt.target.value);
    }

    infection_duration_changed(evt) {
        this.inf_duration = Number(evt.target.value) * FPS;
        $("#inf_duration_val").text(evt.target.value);
    }

    death_rate_changed(evt) {
        this.death_rate = Number(evt.target.value) / 100;
        $("#death_rate_val").text(evt.target.value);
    }

    mouse_down(evt) {
        this.mouse.set(evt.offsetX, evt.offsetY);
        if (this.adding_wall) {
            this.add_wall();
        } else if (this.removing_wall) {
            this.remove_wall();
        } else {
            this.check_wall_ends();
        }
    }

    mouse_up(evt) {
        this.mouse.set(evt.offsetX, evt.offsetY);
        if (this.controlled_wall) {
            this.controlled_pt = null;
            this.controlled_wall.calc_perp();
            this.controlled_wall = null;
        }
    }

    mouse_move(evt) {
        this.mouse.set(evt.offsetX, evt.offsetY);
        if (this.controlled_pt) {
            this.controlled_pt.set(this.mouse);
        }
    }

    draw_chart() {
        if (this.chart_data.length == 1) {
            let y = this.chart_data[0][0][0] / this.balls.length * CHART_HEIGHT;
            draw_rect(this.chart_ctx, 0, 0, CHART_WIDTH, y, Main.StatusColors[Main.Status.GOOD]);
            draw_rect(this.chart_ctx, 0, y, CHART_WIDTH, CHART_HEIGHT - y, Main.StatusColors[Main.Status.INFECTED]);
            return;
        }
        this.chart_ctx.fillStyle = BACKGROUND;
        this.chart_ctx.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
        let total_time = this.chart_data[this.chart_data.length-1][1];
        let heights = new Array(this.chart_data.length).fill(0);
        for (let j = 0; j < this.chart_data[0][0].length; j++) {
            this.chart_ctx.fillStyle = Main.StatusColors[j];
            this.chart_ctx.beginPath();
            this.chart_ctx.moveTo(CHART_WIDTH, heights[heights.length-1]);
            for (let i = heights.length-2; i >= 0; i--) {
                let x = this.chart_data[i][1] / total_time * CHART_WIDTH;
                this.chart_ctx.lineTo(x, heights[i]);
            }
            for (let i = 0; i < this.chart_data.length; i++) {
                let x = this.chart_data[i][1] / total_time * CHART_WIDTH;
                let y = this.chart_data[i][0][j] / this.balls.length * CHART_HEIGHT;
                heights[i] += y;
                this.chart_ctx.lineTo(x, heights[i]);
            }
            this.chart_ctx.closePath();
            this.chart_ctx.fill();
        }
    }

    update() {
        this.sim_ctx.fillStyle = BACKGROUND;
        this.sim_ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

        if (this.running) {
            for (let ball of this.balls) {
                ball.update();
            }
            if (this.status_qnts[Main.Status.INFECTED] == 0) {
                this.sim_done = true;
            }
            this.time += 1;
            this.set_time();
        }
        for (let wall of this.walls) {
            wall.update(this.mouse, this.mouse_dist_thresh);
        }
        for (let ball of this.balls) {
            ball.draw();
        }
        for (let wall of this.walls) {
            wall.draw()
        }
        if (this.add_wall_pt) {
            draw_circle(this.sim_ctx, this.add_wall_pt, 5, BLUE);
        }
        if (this.adding_wall) {
            draw_circle(this.sim_ctx, this.mouse, 5, BLUE);
        }
        if (this.status_changed) {
            this.chart_data.push([this.status_qnts.slice(), this.time]);
            this.set_status_quantities();
            this.draw_chart();
            this.status_changed = false;
        }
        if (this.sim_done) {
            this.pause();
        }
    }
}

Main.Status = {GOOD: 0, RECOVERD: 1, INFECTED: 2, DEAD: 3};
Main.StatusColors = [WHITE, DARK_GREEN, RED, BLACK];



document.addEventListener("DOMContentLoaded", function() {

    let sim_canvas = document.getElementById("sim_canvas");
    let sim_ctx = sim_canvas.getContext("2d");
    let chart_canvas = document.getElementById("chart_canvas");
    let chart_ctx = chart_canvas.getContext("2d");
    sim_canvas.width = SIM_WIDTH;
    sim_canvas.height = SIM_HEIGHT;
    chart_canvas.width = CHART_WIDTH;
    chart_canvas.height = CHART_HEIGHT;
    let main = new Main(sim_ctx, chart_ctx);

    $(sim_canvas).mousedown(main.mouse_down.bind(main));
    $(sim_canvas).mouseup(main.mouse_up.bind(main));
    $(sim_canvas).mousemove(main.mouse_move.bind(main));
    $("#start_simlation").click(main.start.bind(main));
    $("#pause_simlation").click(main.pause.bind(main));
    $("#reset").click(main.reset_handler.bind(main));
    $("#add_wall").click(main.add_wall_handler.bind(main));
    $("#remove_wall").click(main.remove_wall_handler.bind(main));
    $("#remove_all_walls").click(main.remove_all_walls_handler.bind(main));
    $("#pop_size").on('input change', main.pop_size_changed.bind(main));
    $("#start_infected").on('input change', main.start_infected_changed.bind(main));
    $("#ball_radius").on('input change', main.radius_changed.bind(main));
    $("#speed").on('input change', main.speed_changed.bind(main));
    $("#inf_chance").on('input', main.infection_chance_changed.bind(main));
    $("#inf_duration").on('input', main.infection_duration_changed.bind(main));
    $("#death_rate").on('input', main.death_rate_changed.bind(main));

    setInterval(main.update.bind(main), 1000 / FPS);

});

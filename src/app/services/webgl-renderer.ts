import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WebglRendererService {
  private gl: WebGL2RenderingContext | null = null;
  private program!: WebGLProgram;
  private vao!: WebGLVertexArrayObject;
  private instanceBuffer!: WebGLBuffer;
  private capacity = 0;
  private fragmentSrc = this.defaultFragmentShader();

  init(canvas: HTMLCanvasElement): void {
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) throw new Error('WebGL2 not supported');
    this.createProgram();
    this.createGeometry();
    this.resize(canvas.width, canvas.height);
  }

  resize(w: number, h: number): void {
    if (!this.gl) return;
    this.gl.viewport(0, 0, w, h);
  }

  updateFragmentShader(src: string): void {
    this.fragmentSrc = src;
    if (!this.gl) return;
    this.createProgram();
  }

  draw(cells: Set<number>, ages: Map<number, number>, cellSize: number,
       offset: { x: number; y: number }, colorEnabled: boolean,
       baseHue: number): void {
    const gl = this.gl;
    if (!gl) return;
    gl.clear(gl.COLOR_BUFFER_BIT);

    const count = cells.size;
    if (count === 0) return;
    if (count > this.capacity) {
      this.capacity = Math.max(count, this.capacity * 2, 256);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.capacity * 3 * 4, gl.DYNAMIC_DRAW);
    }

    const data = new Float32Array(count * 3);
    let idx = 0;
    for (const key of cells) {
      const [x, y] = this.decode(key);
      data[idx++] = x;
      data[idx++] = y;
      data[idx++] = ages.get(key) ?? 0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);

    gl.useProgram(this.program);
    const loc = (name: string) => gl.getUniformLocation(this.program, name);
    gl.uniform2f(loc('u_canvas'), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(loc('u_cellSize'), cellSize);
    gl.uniform2f(loc('u_offset'), offset.x, offset.y);
    gl.uniform1f(loc('u_baseHue'), baseHue);
    gl.uniform1i(loc('u_colorEnabled'), colorEnabled ? 1 : 0);

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  }

  private createGeometry(): void {
    const gl = this.gl!;
    const quad = new Float32Array([
      0, 0, 1, 0, 0, 1, 1, 1
    ]);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 12, 8);
    gl.vertexAttribDivisor(2, 1);
  }

  private createProgram(): void {
    const gl = this.gl!;
    if (this.program) gl.deleteProgram(this.program);
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, this.vertexShader());
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, this.fragmentSrc);
    gl.compileShader(fs);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.bindAttribLocation(this.program, 0, 'a_pos');
    gl.bindAttribLocation(this.program, 1, 'a_offset');
    gl.bindAttribLocation(this.program, 2, 'a_age');
    gl.linkProgram(this.program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }

  private vertexShader(): string {
    return `#version 300 es
    precision highp float;
    layout(location=0) in vec2 a_pos;
    layout(location=1) in vec2 a_offset;
    layout(location=2) in float a_age;
    uniform vec2 u_canvas;
    uniform float u_cellSize;
    uniform vec2 u_offset;
    out float v_age;
    void main(){
      vec2 world = (a_offset + a_pos + u_offset) * u_cellSize;
      vec2 screen = world + u_canvas * 0.5;
      vec2 clip = screen / u_canvas * 2.0 - 1.0;
      gl_Position = vec4(clip, 0.0, 1.0);
      v_age = a_age;
    }`;
  }

  private defaultFragmentShader(): string {
    return `#version 300 es
    precision highp float;
    uniform bool u_colorEnabled;
    uniform float u_baseHue;
    in float v_age;
    out vec4 outColor;
    vec3 hsl2rgb(float h,float s,float l){
      h = mod(h,360.0);
      float c = (1.0-abs(2.0*l-1.0))*s;
      float x = c*(1.0-abs(mod(h/60.0,2.0)-1.0));
      vec3 rgb;
      if(h<60.0) rgb=vec3(c,x,0);
      else if(h<120.0) rgb=vec3(x,c,0);
      else if(h<180.0) rgb=vec3(0,c,x);
      else if(h<240.0) rgb=vec3(0,x,c);
      else if(h<300.0) rgb=vec3(x,0,c);
      else rgb=vec3(c,0,x);
      float m=l-0.5*c;
      return rgb+m;
    }
    void main(){
      if(!u_colorEnabled){
        outColor=vec4(0,0,0,1);
      }else{
        float h=mod(u_baseHue+v_age*15.0,360.0);
        float l=0.4+min(v_age,10.0)*0.05;
        outColor=vec4(hsl2rgb(h,0.7,l),1.0);
      }
    }`;
  }

  private decode(key: number): [number, number] {
    const x = (key >> 16) << 16 >> 16;
    const y = (key << 16) >> 16;
    return [x, y];
  }
}

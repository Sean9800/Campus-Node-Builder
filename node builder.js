const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let img = null;
let nodes = []; // {id, name, x, y, links:[id,...]}
let mode = 'add';
let linkFirst = null;
let nextNum = 1;
 
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      draw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
 
document.getElementById('modeAdd').addEventListener('click', () => setMode('add'));
document.getElementById('modeLink').addEventListener('click', () => setMode('link'));
function setMode(m){
  mode = m; linkFirst = null;
  document.getElementById('modeAdd').classList.toggle('active', m === 'add');
  document.getElementById('modeLink').classList.toggle('active', m === 'link');
  draw();
}
 
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.round((e.clientX - rect.left) * scaleX);
  const y = Math.round((e.clientY - rect.top) * scaleY);
 
  if (mode === 'add') {
    const name = prompt('Name this location (e.g. "Library"):');
    if (!name) return;
    const id = slugify(name);
    nodes.push({ id, name, x, y, links: [] });
    nextNum++;
    refreshList(); draw();
  } else {
    const hit = nearestNode(x, y);
    if (!hit) return;
    if (!linkFirst) { linkFirst = hit; draw(); return; }
    if (linkFirst.id !== hit.id) toggleLink(linkFirst, hit);
    linkFirst = null;
    draw();
  }
});
 
function nearestNode(x, y){
  let best = null, bestD = 20 * 20; // 20px click radius (in image pixels)
  for (const n of nodes){
    const d = (n.x-x)**2 + (n.y-y)**2;
    if (d < bestD){ bestD = d; best = n; }
  }
  return best;
}
function toggleLink(a, b){
  const has = a.links.includes(b.id);
  if (has){
    a.links = a.links.filter(id => id !== b.id);
    b.links = b.links.filter(id => id !== a.id);
  } else {
    a.links.push(b.id);
    b.links.push(a.id);
  }
}
function slugify(name){
  let base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
  if (!base) base = 'node';
  let id = base, i = 1;
  while (nodes.some(n => n.id === id)) { id = base + (i++); }
  return id;
}
 
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  else { ctx.fillStyle = '#ddd'; ctx.fillRect(0,0,canvas.width,canvas.height); }
 
  // links
  ctx.strokeStyle = '#C08A2E'; ctx.lineWidth = 2;
  const drawn = new Set();
  nodes.forEach(n => n.links.forEach(lid => {
    const key = [n.id, lid].sort().join('-');
    if (drawn.has(key)) return; drawn.add(key);
    const t = nodes.find(x => x.id === lid);
    if (!t) return;
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }));
 
  // nodes
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 8, 0, Math.PI*2);
    ctx.fillStyle = (linkFirst && linkFirst.id === n.id) ? '#C08A2E' : '#1E4C52';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#152A33';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(n.name, n.x + 12, n.y - 10);
  });
}
 
function refreshList(){
  document.getElementById('count').textContent = nodes.length;
  const ul = document.getElementById('nodeList');
  ul.innerHTML = '';
  nodes.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${n.name} <small>(${n.x}, ${n.y}) · ${n.links.length} link(s)</small></span>`;
    const del = document.createElement('button');
    del.textContent = '✕'; del.className = 'danger';
    del.onclick = () => {
      nodes.forEach(m => m.links = m.links.filter(id => id !== n.id));
      nodes = nodes.filter(m => m.id !== n.id);
      refreshList(); draw();
    };
    li.appendChild(del);
    ul.appendChild(li);
  });
}
 
document.getElementById('clearAll').addEventListener('click', () => {
  if (nodes.length && !confirm('Remove all nodes?')) return;
  nodes = []; refreshList(); draw();
});
 
document.getElementById('exportBtn').addEventListener('click', () => {
  const lines = nodes.map(n =>
    `  { id:"${n.id}", name:"${n.name}", x:${n.x}, y:${n.y}, links:[${n.links.map(l=>'"'+l+'"').join(',')}] },`
  );
  const code =
`// Paste this in place of the "nodes" array in eduvos-streetview.js
// Also set the SVG viewBox in eduvos-streetview.html to:
//   viewBox="0 0 ${canvas.width} ${canvas.height}"
// so these coordinates line up with your map image.
const nodes = [
${lines.join('\n')}
];`;
  document.getElementById('output').value = code;
});
 

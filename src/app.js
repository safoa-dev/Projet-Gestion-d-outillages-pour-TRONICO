// src/app.js
document.addEventListener('DOMContentLoaded', () => {

  window.onload = () => {
  document.querySelector('.interface').classList.add('visible');
};

  // === Initialisation du canvas pour fond animé ===
  const canvas = document.getElementById('circuitCanvas');
  const ctx = canvas.getContext('2d');

  let width, height;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  resize();
  window.addEventListener('resize', resize);

  // Création des lignes de circuit (espacement 40px)
  const spacing = 40;
  const lines = [];
  for (let x = spacing; x < width; x += spacing) {
    lines.push({ x, y1: 0, y2: height });
  }
  for (let y = spacing; y < height; y += spacing) {
    lines.push({ y, x1: 0, x2: width });
  }

  // Pulsations lumineuses animées
  const pulses = [];
  function addPulse() {
    const isHorizontal = Math.random() > 0.5;
    if (isHorizontal) {
      const y = spacing * Math.floor(Math.random() * (height / spacing));
      pulses.push({ type: 'horizontal', y, pos: 0, speed: 2 + Math.random() * 3 });
    } else {
      const x = spacing * Math.floor(Math.random() * (width / spacing));
      pulses.push({ type: 'vertical', x, pos: 0, speed: 2 + Math.random() * 3 });
    }
  }
  setInterval(addPulse, 500);

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Fond noir avec légère opacité pour traînée
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, width, height);

    // Dessiner les lignes cyan
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1;
    lines.forEach(line => {
      ctx.beginPath();
      if (line.x !== undefined) {
        ctx.moveTo(line.x, line.y1);
        ctx.lineTo(line.x, line.y2);
      } else {
        ctx.moveTo(line.x1, line.y);
        ctx.lineTo(line.x2, line.y);
      }
      ctx.stroke();
    });

    // Dessiner les pulsations lumineuses
    pulses.forEach((pulse, index) => {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,255,255,0.8)';
      const size = 8;
      if (pulse.type === 'horizontal') {
        ctx.arc(pulse.pos, pulse.y, size, 0, Math.PI * 2);
        pulse.pos += pulse.speed;
        if (pulse.pos > width) pulses.splice(index, 1);
      } else {
        ctx.arc(pulse.x, pulse.pos, size, 0, Math.PI * 2);
        pulse.pos += pulse.speed;
        if (pulse.pos > height) pulses.splice(index, 1);
      }
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }
  animate();

  // === Gestion formulaire & recherche d'outil ===
  const input = document.getElementById('outilt');
  const bouton = document.getElementById('validerBtn');

  async function valider(e) {
    e.preventDefault();

    const code = input.value.trim();
    if (!code) {
      alert("Veuillez saisir un identifiant d'outil.");
      return;
    }

    try {
      const response = await fetch('http://localhost/threeTest/GestionOutillage/public/getData.php');
      if (!response.ok) throw new Error('Erreur réseau');

      const outils = await response.json();

      const outilTrouve = outils.find(o => o.Code === code);

      if (outilTrouve) {
        // Redirection vers index.html avec paramètre d'animation et code
        window.location.href = `index.html?code=${encodeURIComponent(code)}&animate=true`;
      } else {
        alert('Outil introuvable.');
      }
    } catch (error) {
      console.error('Erreur de requête :', error);
      alert('Erreur de communication avec le serveur.');
    }
  }

  bouton.addEventListener('click', valider);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      valider(e);
    }
  });
});



/*
// src/app.js
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('outilt');
  const bouton = document.getElementById('texte');

  async function valider(e) {
    e.preventDefault(); // ⛔ empêche la redirection automatique

    const code = input.value.trim();
    if (!code) {
      alert('Veuillez saisir un identifiant d’outil.');
      return;
    }

    try {
      // Appel à la base de données via getData.php
      const response = await fetch('http://localhost/threeTest/GestionOutillage/public/getData.php')
      if (!response.ok) {
        throw new Error('Erreur réseau');
      }
      const outils = await response.json();

      // Vérifie si le code existe dans les données reçues
      const outilTrouve = outils.find(o => o.Code === code);

      if (outilTrouve) {
        // Redirection vers l'affichage de l'outil
        window.location.href = `index.html?code=${encodeURIComponent(code)}`;
      } else {
        alert('Outil introuvable.');
        // ⛔ NE PAS rediriger si outil introuvable
      }
    } catch (error) {
      console.error('Erreur de requête :', error);
      alert('Erreur de communication avec le serveur.');
    }
  }

  bouton.addEventListener('click', valider);

  // Autoriser validation avec la touche Entrée
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // empêche soumission formulaire avec Entrée
      valider(e);
    }
  });
});
*/
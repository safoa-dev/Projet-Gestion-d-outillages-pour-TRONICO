import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 150);

const canvas = document.getElementById("model3d");
const renderer = new THREE.WebGLRenderer({ 
  canvas, 
  antialias: true, 
  alpha: true 
});
renderer.setClearColor(0x000000, 0); 
renderer.setSize(window.innerWidth, window.innerHeight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 0.4));

let loadedArmoire1 = null;
let loadedArmoire2 = null;
let armoireGroup = new THREE.Group();

// variable pour Rotation de l armoire
let isRotating = false;
let mouseX = 0;
let selectedArmoire = null; 
let targetRotationY = 0;
let currentRotationY = 0;

//  Variables pour l'animation 360°
let isAnimating360 = false;
let animationStartTime = 0;
let initialRotationY = 0;
const ANIMATION_DURATION = 3000; 

let outillageEmplacements = {};
const outillageInfos = {};
//  Stockage des outillages par emplacement pour identifier chaque outillage individuellement
let outillageParEmplacement = {};
const ficheDiv = document.getElementById('ficheOutillage');
const searchInput = document.getElementById('searchCode'); 
let tiroirsColores = []; 

//  Fonction simplifiée pour chercher l'emplacement d'un outillage
function chercherEmplacementOutillage(codeOutillage) {
  console.log(`🔍 Recherche emplacement pour: "${codeOutillage}"`);

  const codeNormalise = codeOutillage.toString().trim().toUpperCase();

  if (outillageEmplacements[codeNormalise]) {
    const emplacements = outillageEmplacements[codeNormalise];
    if (emplacements && emplacements.length > 0) {
      console.log(`✅ Outillage trouvé dans outillageEmplacements: ${emplacements[0]}`);
      return emplacements[0]; 
    }
  }

  for (const [emplacement, infos] of Object.entries(outillageParEmplacement)) {
    if (!infos) continue;

  //petite fonction pour verifier le code
    const verifierCode = (info) => {
      if (!info || !info.Code) return false;
      const codeBDD = info.Code.toString().trim().toUpperCase();
      return codeBDD === codeNormalise || 
             codeBDD.replace(/\s+/g, '') === codeNormalise.replace(/\s+/g, '');
    };

    // Si les informations est un tableau
    if (Array.isArray(infos)) {
      for (const info of infos) {
        if (verifierCode(info)) {
          console.log(`✅ Outillage trouvé dans tableau: ${emplacement}`);
          return emplacement;
        }
      }
    }
    // Si les informations est un objet simple
    else if (verifierCode(infos)) {
      console.log(`✅ Outillage trouvé dans objet: ${emplacement}`);
      return emplacement;
    }
  }

  console.log(`❌ Outillage "${codeOutillage}" non trouvé en BDD`);
  return null;
}

// Fonction pour convertir un emplacement BDD vers le code tiroir principal (terminant par A) car dans blender j ai nomme tous les tiroire avec nom qui se termine par A
function convertirVersCodeTiroirPrincipal(emplacementBDD) {
  if (!emplacementBDD) return null;
  const emplacement = emplacementBDD.toString().trim().toUpperCase();
  console.log(`🔄 Conversion de l'emplacement: "${emplacement}"`);
  // Vérifier si l'emplacement se termine par A, B, C ou D
  const dernierCaractere = emplacement.slice(-1);
  if (['A', 'B', 'C', 'D'].includes(dernierCaractere)) {
    // Remplacer la dernière lettre par 'A' pour obtenir le tiroir principal
    const codeTiroirPrincipal = emplacement.slice(0, -1) + 'A';
    console.log(`🔄 Conversion: ${emplacement} → ${codeTiroirPrincipal}`);
    return codeTiroirPrincipal;
  }
  
  // Si l'emplacement ne se termine pas par A/B/C/D, le retourner tel quel
  console.log(`⚠️ Emplacement ne se termine pas par A/B/C/D: ${emplacement}`);
  return emplacement;
}

// Fonction pour chercher un tiroir dans les armoires Blender
function chercherTiroirDansArmoires(nomTiroir) {
  if (!nomTiroir) return null;
  
  const nomNormalise = nomTiroir.toString().trim();
  let tiroirTrouve = null;
  
  console.log(`🔍 Recherche du tiroir: "${nomNormalise}"`);
  
  // Recherche dans armoire1
  if (loadedArmoire1) {
    loadedArmoire1.traverse(obj => {
      if (obj.isMesh && obj.name && obj.name.trim() === nomNormalise) {
        tiroirTrouve = obj;
        console.log(`✅ Tiroir trouvé dans armoire1: "${obj.name}"`);
      }
    });
  }
  
  // Recherche dans armoire2 si pas trouvé dans armoire1
  if (!tiroirTrouve && loadedArmoire2) {
    loadedArmoire2.traverse(obj => {
      if (obj.isMesh && obj.name && obj.name.trim() === nomNormalise) {
        tiroirTrouve = obj;
        console.log(`✅ Tiroir trouvé dans armoire2: "${obj.name}"`);
      }
    });
  }
  
  if (!tiroirTrouve) {
    console.log(`❌ Tiroir non trouvé: "${nomNormalise}"`);
  }
  
  return tiroirTrouve;
}

//  fonction pour Récupérer tous les outillages d'un tiroir
function getTousLesOutillagesDuTiroir(codeTiroirPrincipal) {
  if (!codeTiroirPrincipal) return [];
  
  const outillagesDuTiroir = [];
  const baseTiroir = codeTiroirPrincipal.slice(0, -1); 
  
  console.log(`🔍 Recherche tous les outillages pour le tiroir: ${codeTiroirPrincipal}`);
  console.log(`🔍 Base du tiroir: ${baseTiroir}`);
  
  // Chercher tous les emplacements qui commencent par la base du tiroir
  for (const [emplacement, infos] of Object.entries(outillageParEmplacement)) {
    if (emplacement.startsWith(baseTiroir)) {
      console.log(`✅ Emplacement trouvé: ${emplacement}`);
      
      // Si infos est un tableau, ajouter tous les outillages
      if (Array.isArray(infos)) {
        outillagesDuTiroir.push(...infos);
      } else if (infos) {
        // Si infos est un objet simple, l'ajouter
        outillagesDuTiroir.push(infos);
      }
    }
  }
  
  // Aussi chercher dans outillageEmplacements
  for (const [code, emplacements] of Object.entries(outillageEmplacements)) {
    if (emplacements && emplacements.length > 0) {
      for (const emplacement of emplacements) {
        if (emplacement.startsWith(baseTiroir)) {
          // Trouver les infos détaillées de cet outillage
          const infosDetailees = outillageParEmplacement[emplacement];
          if (infosDetailees) {
            if (Array.isArray(infosDetailees)) {
              outillagesDuTiroir.push(...infosDetailees);
            } else {
              outillagesDuTiroir.push(infosDetailees);
            }
          }
        }
      }
    }
  }
  
  // Supprimer les doublons basés sur le NumeroSerie
  const outillagesUniques = [];
  const numerosVus = new Set();
  
  for (const outillage of outillagesDuTiroir) {
    if (outillage && outillage.NumeroSerie && !numerosVus.has(outillage.NumeroSerie)) {
      numerosVus.add(outillage.NumeroSerie);
      outillagesUniques.push(outillage);
    }
  }
  
  console.log(`📊 ${outillagesUniques.length} outillages uniques trouvés dans le tiroir ${codeTiroirPrincipal}`);
  return outillagesUniques;
}

// fonction pour Afficher la fiche avec tous les outillages d'un tiroir
function afficherFicheTiroir(codeTiroirPrincipal) {
  const ficheDiv = document.getElementById('ficheMultiplesOutillages');
  if (!ficheDiv) return;

  const outillagesDuTiroir = getTousLesOutillagesDuTiroir(codeTiroirPrincipal);

  if (outillagesDuTiroir.length === 0) {
    ficheDiv.innerHTML = `
      <div class="fiche-header">
        <h3>Tiroir ${codeTiroirPrincipal}</h3>
        <span class="close-btn">&times;</span>
      </div>
      <div class="fiche-content">
        <p>Aucun outillage trouvé dans ce tiroir.</p>
      </div>
    `;
  } else {
    let contenuHTML = `
      <div class="fiche-header">
        <h2 class="fiche-title">🔧 Tiroir ${codeTiroirPrincipal}</h2>
        <button class="btn-fermer" onclick="fermerFicheMultiples()">&times;</button>
      </div>
      
      <div class="fiche-stats">
        <strong>📊 ${outillagesDuTiroir.length} outillage${outillagesDuTiroir.length > 1 ? 's' : ''} trouvé${outillagesDuTiroir.length > 1 ? 's' : ''}</strong>
      </div>
    `;

    outillagesDuTiroir.forEach((outillage, index) => {
      const badgeColor = outillage.Etat === 'existe' ? '#4caf50' : 
                        outillage.Etat === 'emprunte' ? '#ff9800' : '#f44336';
      
      contenuHTML += `
        <div class="outillage-card" style="border: 1px solid rgba(255,255,255,0.2); margin: 15px 0; padding: 20px; border-radius: 8px; background-color: rgba(255, 255, 255, 0.05); color: white;">
          <div class="outillage-header">
            <h3 class="outillage-title" style="margin: 0 0 15px 0; display: flex; align-items: center; justify-content: space-between;">
              🔧 Outillage ${index + 1}
              <span class="outillage-badge" style="background-color: ${badgeColor}20; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${outillage.Etat || 'inconnu'}
              </span>
            </h3>
          </div>
          
          <div class="outillage-details" style="margin-bottom: 20px;">
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">Code:</span>
              <span class="detail-value">${outillage.Code || 'N/A'}</span>
            </div>
            
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">Numéro de Série:</span>
              <span class="detail-value">${outillage.NumeroSerie || 'N/A'}</span>
            </div>
            
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">Emplacement:</span>
              <span class="detail-value">${outillage.Emplacement || 'N/A'}</span>
            </div>
            
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">État:</span>
              <span class="detail-value">${outillage.Etat || 'N/A'}</span>
            </div>`;
      
      // Ajouter les détails d'emprunt si l'outillage est emprunté cad Emprunteur et Lieu
      if (outillage.Etat === 'emprunte') {
        contenuHTML += `
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">Emprunteur:</span>
              <span class="detail-value">${outillage.Emprunteur || 'Non spécifié'}</span>
            </div>
            
            <div class="detail-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="detail-label" style="font-weight: bold;">Lieu:</span>
              <span class="detail-value">${outillage.Lieu || 'Non spécifié'}</span>
            </div>`;
      }
      
      contenuHTML += `
          </div>
          
          <!--  Formulaire pour modifier l'état avec boutons radio -->
          <form class="etat-form" data-index="${index}" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 15px;">
              <label style="color: white; font-weight: bold; margin-bottom: 10px; display: block;">Modifier l'état:</label>
              <div style="display: flex; gap: 20px;">
                <label style="color: white; cursor: pointer; display: flex; align-items: center;">
                  <input type="radio" name="etat_${index}" value="existe" ${outillage.Etat === 'existe' ? 'checked' : ''} style="margin-right: 8px; cursor: pointer;">
                  <span style="color: #4caf50;">✅ Existe</span>
                </label>
                <label style="color: white; cursor: pointer; display: flex; align-items: center;">
                  <input type="radio" name="etat_${index}" value="emprunte" ${outillage.Etat === 'emprunte' ? 'checked' : ''} style="margin-right: 8px; cursor: pointer;">
                  <span style="color: #ff9800;">📤 Emprunté</span>
                </label>
              </div>
            </div>
            
            <!--  Champs conditionnels pour emprunt -->
            <div class="details-emprunteur" style="display: ${outillage.Etat === 'emprunte' ? 'block' : 'none'}; margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 5px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <label style="color: white; font-weight: bold; margin-bottom: 5px; display: block;">Emprunteur:</label>
                  <input type="text" class="emprunteur" value="${outillage.Emprunteur || ''}" placeholder="Nom de l'emprunteur"
                         style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; font-size: 14px;">
                </div>
                <div>
                  <label style="color: white; font-weight: bold; margin-bottom: 5px; display: block;">Lieu:</label>
                  <input type="text" class="lieu" value="${outillage.Lieu || ''}" placeholder="Lieu d'utilisation"
                         style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; font-size: 14px;">
                </div>
              </div>
            </div>
            
            <!--  Bouton d'enregistrement -->
            <button type="button" class="btn-enregistrer-tiroir" style="margin-top: 15px; padding: 12px 20px; background: linear-gradient(45deg, #4caf50, #45a049); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s ease;">
              💾 Enregistrer les modifications
            </button>
          </form>
        </div>
      `;
    });

    contenuHTML += '</div>';
    ficheDiv.innerHTML = contenuHTML;
  }

  ficheDiv.style.display = 'block';

  // Ajouter les événements pour chaque formulaire
  ficheDiv.querySelectorAll('.etat-form').forEach((form, index) => {
    const outillage = outillagesDuTiroir[index];
    
    // Événement pour afficher/masquer les détails emprunteur quand on change l'état
    form.querySelectorAll(`input[name="etat_${index}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        const detailsDiv = form.querySelector('.details-emprunteur');
        if (radio.value === 'emprunte') {
          detailsDiv.style.display = 'block';
        } else {
          detailsDiv.style.display = 'none';
          // Vider les champs quand on passe à "existe"
          form.querySelector('.emprunteur').value = '';
          form.querySelector('.lieu').value = '';
        }
      });
    });
    
    // Événement de clic sur le bouton Enregistrer
    const btnEnregistrer = form.querySelector('.btn-enregistrer-tiroir');
    btnEnregistrer.addEventListener('click', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const etat = formData.get(`etat_${index}`);
      
      // Validation pour l'état emprunté
      if (etat === 'emprunte') {
        const emprunteur = form.querySelector('.emprunteur').value.trim();
        const lieu = form.querySelector('.lieu').value.trim();
        
        if (!emprunteur || !lieu) {
          alert('⚠️ Pour un emprunt, Emprunteur et Lieu sont obligatoires');
          return;
        }
      }
      
      const updateData = {
        Code: outillage.Code,
        Etat: etat,
        Emprunteur: etat === 'emprunte' ? form.querySelector('.emprunteur').value : '',
        Lieu: etat === 'emprunte' ? form.querySelector('.lieu').value : '',
        Emplacement: outillage.Emplacement  
      };
      
      console.log('📤 Envoi des données:', updateData);
      
      try {
        const res = await fetch('http://localhost/threeTest/GestionOutillage/public/updateEtat.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        const json = await res.json();
        
        if (json.success) {
          alert(`✅ Outillage ${outillage.NumeroSerie} mis à jour avec succès !`);
          
          if (outillageParEmplacement[outillage.Emplacement]) {
            if (Array.isArray(outillageParEmplacement[outillage.Emplacement])) {
              const itemIndex = outillageParEmplacement[outillage.Emplacement].findIndex(item =>
                item.NumeroSerie === outillage.NumeroSerie
              );
              if (itemIndex !== -1) {
                outillageParEmplacement[outillage.Emplacement][itemIndex] = { 
                  ...outillageParEmplacement[outillage.Emplacement][itemIndex], 
                  ...updateData 
                };
              }
            }
          }
          
          // Recharger la fiche avec les nouvelles données
          setTimeout(() => {
            afficherFicheTiroir(codeTiroirPrincipal);
          }, 500);
          
        } else {
          alert('❌ Erreur lors de la mise à jour : ' + (json.message || 'Erreur inconnue'));
        }
      } catch (err) {
        console.error('❌ Erreur réseau:', err);
        alert('❌ Erreur réseau lors de la mise à jour. Vérifiez votre connexion.');
      }
    });
  });

  // Ajouter l'événement de fermeture
  const closeBtn = ficheDiv.querySelector('.close-btn, .btn-fermer');
  if (closeBtn) {
    closeBtn.onclick = () => {
      ficheDiv.style.display = 'none';
    };
  }
}
// fonction Colorer le tiroir par code outillage
function colorerTiroirParOutillage(codeOutillage, couleur = 0xff0000) {
  console.log(`🎨 Tentative de coloration pour: "${codeOutillage}"`);
  
  //  Chercher l'emplacement de l'outillage
  const emplacementTrouve = chercherEmplacementOutillage(codeOutillage);
  
  if (!emplacementTrouve) {
    console.warn(`❌ Emplacement non trouvé pour: "${codeOutillage}"`);
    return false;
  }

  console.log(`📍 Emplacement trouvé: "${emplacementTrouve}"`);

  //  Convertir vers le code tiroir principal cad qui se termine par A car c est ca ce que j ai fais dans blender
  const codeTiroirPrincipal = convertirVersCodeTiroirPrincipal(emplacementTrouve);
  
  if (!codeTiroirPrincipal) {
    console.warn(`❌ Impossible de convertir l'emplacement: "${emplacementTrouve}"`);
    return false;
  }

  console.log(`🔄 Code tiroir principal: "${codeTiroirPrincipal}"`);

  //  Chercher et colorer le tiroir dans Blender cad d apres le fichier .glb
  const tiroir = chercherTiroirDansArmoires(codeTiroirPrincipal);
  
  if (!tiroir) {
    console.warn(`❌ Tiroir "${codeTiroirPrincipal}" non trouvé dans Blender`);
    
    // Debug: Lister tous les noms de tiroirs disponibles
    console.log("🔍 Tiroirs disponibles:");
    [loadedArmoire1, loadedArmoire2].forEach((armoire, index) => {
      if (armoire) {
        armoire.traverse(obj => {
          if (obj.isMesh && obj.name) {
            console.log(`  Armoire${index + 1}: "${obj.name}"`);
          }
        });
      }
    });
    
    return false;
  }

  // Appliquer la couleur
  let colore = false;
  tiroir.traverse(child => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
      child.material.color.set(couleur);
      child.material.emissive.set(couleur);
      child.material.emissiveIntensity = 0.2;
      
      //Stocker le code tiroir principal pour l'événement click
      child.userData.codeTiroirPrincipal = codeTiroirPrincipal;
      child.userData.outillage = outillageParEmplacement[emplacementTrouve];
      colore = true;
    }
  });

  if (colore) {
    console.log(`✅ Tiroir "${codeTiroirPrincipal}" coloré avec succès!`);
    
    // Ajouter à la liste des tiroirs colorés pour pouvoir les réinitialiser plus tard
    if (!tiroirsColores.includes(tiroir)) {
      tiroirsColores.push(tiroir);
    }
  } else {
    console.warn(`❌ Échec de la coloration du tiroir "${codeTiroirPrincipal}"`);
  }

  return colore;
}

//Fonction pour réinitialiser les couleurs des tiroirs
function reinitialiserCouleursTiroirs() {
  console.log(`🔄 Réinitialisation de ${tiroirsColores.length} tiroirs colorés`);
  
  tiroirsColores.forEach(tiroir => {
    if (tiroir) {
      tiroir.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.set(0xffffff); 
          child.material.emissive.set(0x000000); 
          child.material.emissiveIntensity = 0;
          
          if (child.userData.outillage) {
            delete child.userData.outillage;
          }
          if (child.userData.codeTiroirPrincipal) {
            delete child.userData.codeTiroirPrincipal;
          }
        }
      });
    }
  });
  
  // Vider la liste des tiroirs colorés
  tiroirsColores = [];
  console.log(`✅ Couleurs réinitialisées`);
}


async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json(); 
}

async function loadOutillages() {
  try {
    const response = await fetch('http://localhost/threeTest/GestionOutillage/public/getData.php');
    const data = await response.json();
    outillageEmplacements = data.outillageEmplacements || {};
    outillageParEmplacement = data.outillageParEmplacement || {};
    console.log('📦 Données chargées:', data);
  } catch (error) {
    console.error('❌ Erreur lors du chargement des outillages:', error);
  }
}


function startAnimation360() {
  if (isAnimating360) return;
  
  console.log('🎬 Démarrage de l\'animation 360°');
  isAnimating360 = true;
  animationStartTime = Date.now();
  initialRotationY = currentRotationY;
  
  // pour desactiver tous les controles lors de l animation
  canvas.style.pointerEvents = 'none';
}
//fonction pour Vérifier si on doit déclencher l'animation au chargement
function checkForAnimation() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const animate = urlParams.get('animate');

  if (code && animate !== 'false') {
    setTimeout(() => {
      if (loadedArmoire1 && loadedArmoire2) {
        startAnimation360();
      }
    }, 20);
  }
}

// fonction pour initialiser les effets visuels du background futuriste
function initializeFuturisticBackground() {
  console.log('🎨 Initialisation du background futuriste');
  const futuristicBg = document.querySelector('.futuristic-background');
  if (futuristicBg) {
    futuristicBg.style.display = 'block';
    console.log('✅ Background futuriste activé');
  }
  
  // Créer des particules dynamiques supplémentaires
  createDynamicParticles();
}

// fonction qui Créer des particules dynamiques supplémentaires
function createDynamicParticles() {
  const particleContainer = document.createElement('div');
  particleContainer.className = 'dynamic-particles';
  particleContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    pointer-events: none;
  `;
  
  // Créer 20 particules flottantes
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: radial-gradient(circle, #00ffff 0%, rgba(0, 255, 255, 0.3) 70%, transparent 100%);
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.7 + 0.3};
      animation: floatParticle ${Math.random() * 10 + 15}s infinite linear;
      animation-delay: ${Math.random() * 5}s;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
    `;
    particleContainer.appendChild(particle);
  }
  
  // Ajouter les styles d'animation pour les particules flottantes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatParticle {
      0% { 
        transform: translateY(100vh) translateX(0px) scale(0.5); 
        opacity: 0;
      }
      10% { 
        opacity: 0.7;
        transform: translateY(80vh) translateX(10px) scale(0.8);
      }
      50% { 
        opacity: 1;
        transform: translateY(40vh) translateX(-20px) scale(1);
      }
      90% { 
        opacity: 0.3;
        transform: translateY(10vh) translateX(15px) scale(0.6);
      }
      100% { 
        transform: translateY(-10vh) translateX(30px) scale(0.3); 
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(particleContainer);
  console.log('✅ Particules dynamiques créées');
}
// fonction Synchroniser les effets avec les animations 3D
function syncBackgroundEffects() {
  const futuristicBg = document.querySelector('.futuristic-background');
  const pulses = document.querySelectorAll('.pulse');
  const waves = document.querySelectorAll('.electromagnetic-wave');
  
  if (isAnimating360) {
    // Accélérer les animations pendant la rotation 360°
    futuristicBg?.style.setProperty('animation-duration', '10s');
    pulses.forEach(pulse => {
      pulse.style.setProperty('animation-duration', '3s');
    });
    waves.forEach(wave => {
      wave.style.setProperty('animation-duration', '4s');
    });
  } else {
    // Vitesse normale
    futuristicBg?.style.setProperty('animation-duration', '20s');
    pulses.forEach(pulse => {
      pulse.style.setProperty('animation-duration', '6s');
    });
    waves.forEach(wave => {
      wave.style.setProperty('animation-duration', '8s');
    });
  }
}

//  Fonction pour afficher tous les outillages chargés
function afficherTousLesOutillages() {
  console.log('\n📋 TOUS LES OUTILLAGES CHARGÉS EN BDD:');
  console.log('═'.repeat(60));
  
  let count = 0;
  for (const [emplacement, info] of Object.entries(outillageParEmplacement)) {
    console.log(`${count + 1}. Code: "${info.Code}" | Emplacement: "${emplacement}" | État: ${info.Etat}`);
    count++;
  }
  
  console.log(`\n📊 Total: ${count} outillages trouvés`);
  console.log('═'.repeat(60));
  
  // Afficher aussi outillageEmplacements
  console.log('\n📋 STRUCTURE outillageEmplacements:');
  console.log(outillageEmplacements);
}

//  Fonction pour chercher un code similaire au code saisit
function chercherCodesSimilaires(codeRecherche) {
  console.log(`\n🔍 RECHERCHE DE CODES SIMILAIRES À: "${codeRecherche}"`);
  console.log('═'.repeat(60));
  
  const codesSimilaires = [];
  
  for (const [emplacement, info] of Object.entries(outillageParEmplacement)) {
    const code = info.Code;
    if (code === codeRecherche) {
      console.log(`✅ MATCH EXACT: "${code}" → Emplacement: "${emplacement}"`);
      return;
    }
    
    // Recherche avec espaces supprimés
    if (code.replace(/\s+/g, '') === codeRecherche.replace(/\s+/g, '')) {
      console.log(`⚠️ MATCH AVEC ESPACES: "${code}" → Emplacement: "${emplacement}"`);
      codesSimilaires.push({code, emplacement, raison: 'espaces'});
    }
    
    // Recherche partielle (contient le code)
    if (code.includes(codeRecherche) || codeRecherche.includes(code)) {
      console.log(`🔍 MATCH PARTIEL: "${code}" → Emplacement: "${emplacement}"`);
      codesSimilaires.push({code, emplacement, raison: 'partiel'});
    }
    
    // Recherche avec casse différente
    if (code.toLowerCase() === codeRecherche.toLowerCase()) {
      console.log(`🔤 MATCH CASSE: "${code}" → Emplacement: "${emplacement}"`);
      codesSimilaires.push({code, emplacement, raison: 'casse'});
    }
  }
  
  if (codesSimilaires.length === 0) {
    console.log('❌ Aucun code similaire trouvé');
  }
  
  console.log('═'.repeat(60));
}
// Fonction pour afficher un message dans la fiche d'action
function afficherResultatDansFiche(typeAction, success, message, details = {}) {
    const fiche = document.getElementById('ficheAction');
    const title = document.getElementById('ficheActionTitle');
    const content = document.getElementById('ficheActionContent');
    
    let titleText = '';
    let messageClass = success ? 'success-message' : 'error-message';
    let icon = success ? '✅' : '❌';
    
    switch(typeAction) {
        case 'ajouter':
            titleText = success ? '✅ Ajout Réussi' : '❌ Échec de l\'ajout';
            break;
        case 'supprimer':
            titleText = success ? '✅ Suppression Réussie' : '❌ Échec de la suppression';
            break;
        case 'modifier':
            titleText = success ? '✅ Modification Réussie' : '❌ Échec de la modification';
            break;
    }
    
    title.textContent = titleText;
    
    let detailsHtml = '';
    if (details && Object.keys(details).length > 0) {
        detailsHtml = '<div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">';
        Object.entries(details).forEach(([key, value]) => {
            detailsHtml += `<div><strong>${key}:</strong> ${value}</div>`;
        });
        detailsHtml += '</div>';
    }
    
    content.innerHTML = `
        <div class="${messageClass}">
            ${icon} ${message}
            ${detailsHtml}
        </div>
        <div class="action-buttons">
            <button class="action-btn btn-secondary" onclick="fermerFicheAction()">Fermer</button>
        </div>
    `;
    fiche.style.display = 'block';
}
//  Fonction pour vérifier la structure des données
function verifierStructureDonnees() {
  console.log('\n🔬 VÉRIFICATION STRUCTURE DES DONNÉES:');
  console.log('═'.repeat(60));
  
  console.log('📊 Statistiques:');
  console.log(`   • outillageParEmplacement: ${Object.keys(outillageParEmplacement).length} entrées`);
  console.log(`   • outillageEmplacements: ${Object.keys(outillageEmplacements).length} entrées`);
  // Vérifier un échantillon
  const premierEchantillon = Object.entries(outillageParEmplacement)[0];
  if (premierEchantillon) {
    const [emplacement, info] = premierEchantillon;
    console.log('\n📝 Premier échantillon:');
    console.log(`   • Emplacement clé: "${emplacement}"`);
    console.log(`   • Info complète:`, info);
    console.log(`   • Propriétés disponibles: ${Object.keys(info).join(', ')}`);
  }
  // Vérifier les types de codes
  const typesCodes = new Set();
  for (const info of Object.values(outillageParEmplacement)) {
    if (info.Code) {
      // Extraire le préfixe (lettres au début)
      const match = info.Code.match(/^([A-Z]+)/);
      if (match) {
        typesCodes.add(match[1]);
      }
    }
  }
  
  console.log(`\n🏷️ Préfixes de codes trouvés: ${Array.from(typesCodes).join(', ')}`);
  console.log('═'.repeat(60));
}

// Fonction pour tester la connectivité BDD
function testerConnexionBDD() {
  console.log('\n🌐 TEST DE CONNEXION BDD:');
  console.log('═'.repeat(60));
  
  fetch('http://localhost/threeTest/GestionOutillage/public/getData.php')
    .then(response => {
      console.log(`📡 Statut réponse: ${response.status} ${response.statusText}`);
      return response.json();
    })
    .then(data => {
      console.log(`📦 Données reçues: ${data.length} enregistrements`);
      
      if (data.length > 0) {
        console.log('📝 Premier enregistrement:', data[0]);
        console.log('📝 Propriétés disponibles:', Object.keys(data[0]).join(', '));
        
        // Chercher OUT0001422 dans les données brutes ca c est juste un test que j ai fais
        const found = data.find(item => item.Code === 'OUT0001422');
        if (found) {
          console.log('✅ OUT0001422 trouvé dans les données brutes:', found);
        } else {
          console.log('❌ OUT0001422 NON trouvé dans les données brutes');
          
          // Chercher des codes similaires
          const similar = data.filter(item => 
            item.Code && (
              item.Code.includes('OUT0001422') || 
              item.Code.includes('1422') ||
              'OUT0001422'.includes(item.Code)
            )
          );
          
          if (similar.length > 0) {
            console.log('🔍 Codes similaires trouvés:', similar);
          }
        }
      }
    })
    .catch(error => {
      console.error('❌ Erreur connexion BDD:', error);
    });
}

// Fonction de diagnostic complet
function diagnosticComplet(codeRecherche = 'OUT0001422') {
  console.clear();
  console.log(`🚨 DIAGNOSTIC COMPLET POUR: "${codeRecherche}"`);
  console.log('🔬'.repeat(30));
  verifierStructureDonnees();
  testerConnexionBDD();
  setTimeout(() => {
    chercherCodesSimilaires(codeRecherche);
  }, 1000);
  
  //Afficher tous les outillages
  setTimeout(() => {
    afficherTousLesOutillages();
  }, 2000);
}

//Fonction de test pour vérifier la coloration
function testerColoration(codeOutillage) {
  console.log(`\n🧪 TEST DE COLORATION POUR: "${codeOutillage}"`);
  console.log('═'.repeat(50));
  
  reinitialiserCouleursTiroirs();
  const succes = colorerTiroirParOutillage(codeOutillage, 0x00ff00); // Vert pour le test
  
  if (succes) {
    console.log('✅ Test réussi: Tiroir coloré');
  } else {
    console.log('❌ Test échoué: Tiroir non coloré');
    
    // Diagnostic supplémentaire
    const emplacement = chercherEmplacementOutillage(codeOutillage);
    if (emplacement) {
      console.log(`🔍 Emplacement trouvé: "${emplacement}"`);
      const codeTiroir = convertirVersCodeTiroirPrincipal(emplacement);
      console.log(`🔄 Code tiroir calculé: "${codeTiroir}"`);
      
      // Vérifier si le tiroir existe dans Blender
      const tiroir = chercherTiroirDansArmoires(codeTiroir);
      console.log(`🎯 Tiroir trouvé dans Blender: ${tiroir ? 'OUI' : 'NON'}`);
    }
  }
  
  console.log('═'.repeat(50));
  return succes;
}
//fonction qui affiche la fiche
function afficherFiche(info) {
  const ficheDiv = document.getElementById('ficheMultiplesOutillages');
  const outillages = Array.isArray(info) ? info : [info];
  let html = `
    <div class="fiche-header">
      <h2 class="fiche-title">🔧 Outillages du tiroir</h2>
      <button class="btn-fermer" onclick="fermerFicheMultiples()">&times;</button>
    </div>
    
    <div class="fiche-stats">
      <strong>📊 ${outillages.length} outillage${outillages.length > 1 ? 's' : ''} trouvé${outillages.length > 1 ? 's' : ''}</strong>
    </div>
  `;
  
  if (outillages.length === 0) {
    html += `
      <div class="no-outillages">
        <div class="no-outillages-icon">❌</div>
        <p>Aucun outillage trouvé dans ce tiroir</p>
      </div>
    `;
  } else {
    outillages.forEach((outillage, index) => {
      // Déterminer la couleur du badge selon l'état
      const badgeColor = outillage.Etat === 'existe' ? '#4caf50' : 
                        outillage.Etat === 'emprunte' ? '#ff9800' : '#f44336';
      
      html += `
        <div class="outillage-card">
          <div class="outillage-header">
            <h3 class="outillage-title">
              🔧 Outillage ${index + 1}
              <span class="outillage-badge" style="background-color: ${badgeColor}20; color: ${badgeColor}; border-color: ${badgeColor};">
                ${outillage.Etat || 'inconnu'}
              </span>
            </h3>
          </div>
          
          <div class="outillage-details">
            <div class="detail-item">
              <span class="detail-label">Code</span>
              <span class="detail-value">${outillage.Code || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Numéro de Série</span>
              <span class="detail-value">${outillage.NumeroSerie || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Emplacement</span>
              <span class="detail-value">${outillage.Emplacement || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">État</span>
              <span class="detail-value">${outillage.Etat || 'N/A'}</span>
            </div>
      `;
      if (outillage.Etat === 'emprunte') {
        html += `
            <div class="detail-item">
              <span class="detail-label">Emprunteur</span>
              <span class="detail-value">${outillage.Emprunteur || 'Non spécifié'}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Lieu</span>
              <span class="detail-value">${outillage.Lieu || 'Non spécifié'}</span>
            </div>
        `;
      }
      
      html += `
          </div>
          
          <!-- Formulaire pour modifier l'état -->
          <form class="etat-form" data-index="${index}" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
            <div style="margin-bottom: 10px;">
              <label style="margin-right: 15px;">
                <input type="radio" name="etat_${index}" value="existe" ${outillage.Etat === 'existe' ? 'checked' : ''} style="margin-right: 5px;">
                ✅ Existe
              </label>
              <label>
                <input type="radio" name="etat_${index}" value="emprunte" ${outillage.Etat === 'emprunte' ? 'checked' : ''} style="margin-right: 5px;">
                📤 Emprunté
              </label>
            </div>
            
            <div class="details-emprunteur" style="display: ${outillage.Etat === 'emprunte' ? 'block' : 'none'}; margin-top: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label class="detail-label">Emprunteur:</label>
                  <input type="text" class="emprunteur" value="${outillage.Emprunteur || ''}" 
                         style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white;">
                </div>
                <div>
                  <label class="detail-label">Lieu:</label>
                  <input type="text" class="lieu" value="${outillage.Lieu || ''}" 
                         style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white;">
                </div>
              </div>
            </div>
            
            <button type="button" class="btn-enregistrer" style="margin-top: 10px; padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
              💾 Enregistrer
            </button>
          </form>
        </div>
      `;
    });
  }
  
  ficheDiv.innerHTML = html;
  ficheDiv.style.display = 'block';
  
  // Ajouter les événements pour chaque formulaire
  ficheDiv.querySelectorAll('.etat-form').forEach((form, index) => {
    const outillage = outillages[index];
    
    // Événement pour afficher/masquer les détails emprunteur(je sais que j ai deja fais ca dans la fonction afficherFicheTiroire)juste pour eviter nimporte quel erreur peut parvenir
    form.querySelectorAll(`input[name="etat_${index}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        const detailsDiv = form.querySelector('.details-emprunteur');
        detailsDiv.style.display = radio.value === 'emprunte' ? 'block' : 'none';
      });
    });
    
    // Événement pour le bouton Enregistrer
    const btnEnregistrer = form.querySelector('.btn-enregistrer');
    btnEnregistrer.addEventListener('click', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const etat = formData.get(`etat_${index}`);
      
      // Validation pour l'état emprunté
      if (etat === 'emprunte') {
        const emprunteur = form.querySelector('.emprunteur').value.trim();
        const lieu = form.querySelector('.lieu').value.trim();
        
        if (!emprunteur || !lieu) {
          alert('⚠️ Pour un emprunt, Emprunteur et Lieu sont obligatoires');
          return;
        }
      }
      
      const updateData = {
        Code: outillage.Code,
        Etat: etat,
        Emprunteur: etat === 'emprunte' ? form.querySelector('.emprunteur').value : '',
        Lieu: etat === 'emprunte' ? form.querySelector('.lieu').value : '',
        Emplacement: outillage.Emplacement  
      };
      
      try {
        const res = await fetch('http://localhost/threeTest/GestionOutillage/public/updateEtat.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        const json = await res.json();
        
        if (json.success) {
          alert(`✅ Outillage ${outillage.NumeroSerie} mis à jour avec succès !`);
          
          // Mettre à jour les données locales
          if (outillageParEmplacement[outillage.Emplacement]) {
            if (Array.isArray(outillageParEmplacement[outillage.Emplacement])) {
              const itemIndex = outillageParEmplacement[outillage.Emplacement].findIndex(item =>
                item.NumeroSerie === outillage.NumeroSerie
              );
              if (itemIndex !== -1) {
                outillageParEmplacement[outillage.Emplacement][itemIndex] = { 
                  ...outillageParEmplacement[outillage.Emplacement][itemIndex], 
                  ...updateData 
                };
              }
            }
          }
          
          // Recharger la fiche avec les nouvelles données
          const nouvellesData = Array.isArray(outillageParEmplacement[outillage.Emplacement])
            ? outillageParEmplacement[outillage.Emplacement]
            : [outillageParEmplacement[outillage.Emplacement]];
          afficherFiche(nouvellesData);
          
        } else {
          alert('❌ Erreur lors de la mise à jour : ' + json.message);
        }
      } catch (err) {
        console.error(err);
        alert('❌ Erreur réseau lors de la mise à jour.');
      }
    });
  });
}

// Fonction pour fermer la fiche
function fermerFicheMultiples() {
  const ficheDiv = document.getElementById('ficheMultiplesOutillages');
  ficheDiv.style.display = 'none';
}


//fonction Chargement des emplacements avec gestion multiple outillages par emplacement
async function chargerEmplacements() {
  try {
    const res = await fetch('http://localhost/threeTest/GestionOutillage/public/getData.php');
    const data = await res.json();

    console.log(`📦 Données reçues de la BDD: ${data.length} enregistrements`);
    outillageEmplacements = {};
    for (const key in outillageParEmplacement) {
      if (Object.hasOwnProperty.call(outillageParEmplacement, key)) {
        delete outillageParEmplacement[key];
      }
    }

    // Gérer plusieurs outillages par emplacement
    data.forEach(item => {
      const cleanName = item.Emplacement.trim();
      const codeNormalise = item.Code.trim().toUpperCase();

      // Construction outillageEmplacements : code => [emplacements]
      if (!outillageEmplacements[codeNormalise]) {
        outillageEmplacements[codeNormalise] = [];
      }
      outillageEmplacements[codeNormalise].push(cleanName);

      // Stocker tous les outillages par emplacement
      if (!outillageParEmplacement[cleanName]) {
        outillageParEmplacement[cleanName] = [];
      }
      
      // Ajouter l'outillage à la liste de cet emplacement
      outillageParEmplacement[cleanName].push({
        ...item,
        Emplacement: cleanName,
        Code: codeNormalise,
        uniqueId: `${codeNormalise}_${item.NumeroSerie || Math.random()}`
      });

      // Mise à jour outillageInfos
      if (!outillageInfos[codeNormalise]) {
        outillageInfos[codeNormalise] = { ...item, Code: codeNormalise };
      }
    });

    console.log('✅ Structures de données construites:');
    console.log(`   • outillageEmplacements: ${Object.keys(outillageEmplacements).length} codes`);
    console.log(`   • outillageParEmplacement: ${Object.keys(outillageParEmplacement).length} emplacements`);
    console.log(`   • outillageInfos: ${Object.keys(outillageInfos).length} outillages`);

    appliquerColorationAmelioree();
    initialiserRecherche();
    checkForAnimation();
  } catch (err) {
    console.error('❌ Erreur lors du chargement des emplacements:', err);
  }
}

function onCanvasClick(event) {
  if (isRotating || isAnimating360) return; // Bloque tous clique lors de la rotation ou animation
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Vérifier que armoireGroup et ses enfants existent
  if (!armoireGroup || !armoireGroup.children) {
    console.warn("⚠️ armoireGroup non disponible ou vide");
    return;
  }
  const intersects = raycaster.intersectObjects(armoireGroup.children, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj) {
      if (obj.userData) {
        // Cas tiroire avec plusieur outillage
        if (obj.userData.codeTiroirPrincipal) {
          console.log(`🎯 Clic sur tiroir: ${obj.userData.codeTiroirPrincipal}`);
          afficherFicheTiroir(obj.userData.codeTiroirPrincipal);
          return;
        }

        // Cas outillage (unique ou tableau)
        if (obj.userData.outillage) {
          const outillagesArray = Array.isArray(obj.userData.outillage)
            ? obj.userData.outillage
            : [obj.userData.outillage];
          afficherFiche(outillagesArray);
          return;
        }
      }
      obj = obj.parent;
    }
  } else {
    console.log("ℹ️ Aucun objet intersecté au clic.");
  }
}

function initialiserRecherche() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const code = e.target.value.trim();
      if (code) {
        rechercherParCodeAmeliore(code); 
      } else {
        reinitialiserCouleurs();
      }
    });
  }
}

// Recherche par code (ancienne version pour compatibilité)
function rechercherParCode(code) {
  console.log(`🔍 rechercherParCode appelée avec: "${code}"`);
  // Rediriger vers la nouvelle fonction améliorée
  rechercherParCodeAmeliore(code);
}

// FONCTION PRINCIPALE DE RECHERCHE: Gère les étages A,B,C,D
function rechercherParCodeAmeliore(code) {
  if (!code || code.trim() === '') {
    reinitialiserCouleurs();
    return;
  }
  
  console.log(`🔍 Recherche améliorée pour le code: "${code}"`);
  reinitialiserCouleurs();
  const success = colorerTiroirParOutillage(code, 0x00ff00); // Vert pour la recherche
  
  if (success) {
    console.log(`✅ Coloration réussie pour: "${code}"`);
    
    // Activer les clics sur le canvas
    if (!canvas.hasListener) {
      canvas.addEventListener('click', onCanvasClick);
      canvas.hasListener = true;
    }
  } else {
    console.log(`❌ Échec de la coloration pour: "${code}"`);
    
    // Diagnostic automatique en cas d'échec
    console.log('🚨 DIAGNOSTIC AUTOMATIQUE:');
    chercherCodesSimilaires(code);
  }
}

function reinitialiserCouleurs() {
  tiroirsColores.forEach(child => {
    if (child.material) {
      child.material.color.set(0xffffff);
      child.material.emissive.set(0x000000);
      child.material.emissiveIntensity = 0;
      delete child.userData.outillage;
      delete child.userData.codeTiroirPrincipal;
    }
  });
  tiroirsColores = [];
}

// FONCTION  appliquerColorationAmelioree
function appliquerColorationAmelioree() {
  console.log('🎨 Application de la coloration améliorée...');
  // Vérifier si un code est passé dans l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    console.log(`🔗 Code détecté dans l'URL: "${code}"`);
    
    // Attendre un peu que tout soit bien chargé
    setTimeout(() => {
      rechercherParCodeAmeliore(code);
      
      // Remplir le champ de recherche si il existe
      if (searchInput) {
        searchInput.value = code;
      }
    }, 500);
  }
}

function uniformScaleToMatchSize(obj, targetSize = 10) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scaleFactor = targetSize / maxDimension;
  obj.scale.setScalar(scaleFactor);
}

const loader = new GLTFLoader();

loader.load('/public/armoire1.glb', gltf => {
  uniformScaleToMatchSize(gltf.scene);
  gltf.scene.position.set(-10, 0, 0);
  gltf.scene.rotation.set(-Math.PI / 2, 0, 0); 
  gltf.scene.scale.multiplyScalar(12);
  gltf.scene.scale.set(15, 8, 12);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const min = box.min;
  gltf.scene.position.y = -min.y - 100;

  armoireGroup.add(gltf.scene);
  loadedArmoire1 = gltf.scene;
  
  // Debug: Afficher les noms de mesh de la première armoire
  console.log('📋 [armoire1] Liste brute des mesh names :');
  gltf.scene.traverse(obj => {
    if (obj.isMesh) {
      console.log('   •', `"${obj.name}"`);
    }
  });
  
  if (loadedArmoire1 && loadedArmoire2) {
    chargerEmplacements();
    initializeFuturisticBackground();
  }
}, undefined, err => console.error('Erreur chargement armoire1.glb :', err));

loader.load('/public/armoire2.glb', gltf => {
  uniformScaleToMatchSize(gltf.scene);
  gltf.scene.position.set(10, 0, 0);
  gltf.scene.rotation.set(Math.PI / 2, 0, 0);
  gltf.scene.scale.set(8, 7, 7.3);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const min = box.min;
  gltf.scene.position.y = -min.y - 68;
  gltf.scene.position.z = -110;
  gltf.scene.position.y = -100;

  armoireGroup.add(gltf.scene);
  loadedArmoire2 = gltf.scene;

  // Debug: Afficher les noms de mesh de la deuxième armoire
  console.log('📋 [armoire2] Liste brute des mesh names :');
  gltf.scene.traverse(obj => {
    if (obj.isMesh) {
      console.log('   •', `"${obj.name}"`);
    }
  });

  if (loadedArmoire1 && loadedArmoire2) {
    chargerEmplacements();
    initializeFuturisticBackground();
  }
}, undefined, err => console.error('Erreur chargement armoire2.glb :', err));

scene.add(armoireGroup);
scene.add(new THREE.AxesHelper(5));

// CONTRÔLES DE ROTATION 
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0 && !isAnimating360) { 
    event.preventDefault();
    
    const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(armoireGroup.children, true);
    
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj !== scene) {
        if (obj === loadedArmoire1) {
          selectedArmoire = 'armoire1';
          break;
        } else if (obj === loadedArmoire2) {
          selectedArmoire = 'armoire2';
          break;
        }
        obj = obj.parent;
      }
      
      if (selectedArmoire) {
        isRotating = true;
        mouseX = event.clientX;
        canvas.style.cursor = 'grab';
      }
    }
  }
});

canvas.addEventListener('mousemove', (event) => {
  if (isRotating && selectedArmoire && !isAnimating360) {
    event.preventDefault();
    const deltaX = event.clientX - mouseX;
    
    targetRotationY += deltaX * 0.01;
    
    mouseX = event.clientX;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mouseup', (event) => {
  if (isRotating && !isAnimating360) { 
    event.preventDefault();
    isRotating = false;
    selectedArmoire = null;
    canvas.style.cursor = canvas.hasListener ? 'pointer' : 'default';
  }
});

canvas.addEventListener('mouseleave', () => {
  if (isRotating && !isAnimating360) { 
    isRotating = false;
    selectedArmoire = null;
    canvas.style.cursor = canvas.hasListener ? 'pointer' : 'default';
  }
});
canvas.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1 && !isAnimating360) { 
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      -((touch.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(armoireGroup.children, true);
    
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj !== scene) {
        if (obj === loadedArmoire1) {
          selectedArmoire = 'armoire1';
          break;
        } else if (obj === loadedArmoire2) {
          selectedArmoire = 'armoire2';
          break;
        }
        obj = obj.parent;
      }
      
      if (selectedArmoire) {
        isRotating = true;
        mouseX = touch.clientX;
      }
    }
  }
});

canvas.addEventListener('touchmove', (event) => {
  if (isRotating && selectedArmoire && event.touches.length === 1 && !isAnimating360) { 
    event.preventDefault();
    const deltaX = event.touches[0].clientX - mouseX;
    
    targetRotationY += deltaX * 0.01;
    
    mouseX = event.touches[0].clientX;
  }
});

canvas.addEventListener('touchend', () => {
  if (isRotating && !isAnimating360) { 
    isRotating = false;
    selectedArmoire = null;
  }
});

// ✅ Zoom avec molette 
canvas.addEventListener('wheel', e => {
  if (!isAnimating360) { 
    const delta = e.deltaY, speed = 0.1;
    camera.position.multiplyScalar(delta > 0 ? 1 + speed : 1 - speed);
    const dist = camera.position.length();
    if (dist < 2) camera.position.setLength(2);
    if (dist > 300) camera.position.setLength(300);
  }
});

// ✅ Zoom avec clavier 
window.addEventListener('keydown', e => {
  if (!isAnimating360) { 
    const speed = 0.1;
    if (e.code === 'ArrowUp') camera.position.multiplyScalar(1 - speed);
    else if (e.code === 'ArrowDown') camera.position.multiplyScalar(1 + speed);
    const dist = camera.position.length();
    if (dist < 2) camera.position.setLength(2);
    if (dist > 300) camera.position.setLength(300);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
//  FONCTION D'INSPECTION DES NOMS DE TIROIRS
function inspectorTiroirsBlender() {
  console.log('\n🏗️ INSPECTION DES TIROIRS BLENDER:');
  console.log('═'.repeat(60));
  
  let countArmoire1 = 0;
  let countArmoire2 = 0;
  
  if (loadedArmoire1) {
    console.log('\n📦 ARMOIRE 1:');
    loadedArmoire1.traverse(obj => {
      if (obj.isMesh && obj.name) {
        console.log(`   • "${obj.name}"`);
        countArmoire1++;
      }
    });
  }
  
  if (loadedArmoire2) {
    console.log('\n📦 ARMOIRE 2:');
    loadedArmoire2.traverse(obj => {
      if (obj.isMesh && obj.name) {
        console.log(`   • "${obj.name}"`);
        countArmoire2++;
      }
    });
  }
  
  console.log(`\n📊 TOTAL: ${countArmoire1} tiroirs dans armoire1, ${countArmoire2} tiroirs dans armoire2`);
  console.log('═'.repeat(60));
}

// Rendre les nouvelles fonctions accessibles dans la console (sans redéclarer testerColoration)
window.chercherEmplacementOutillage = chercherEmplacementOutillage;
window.convertirVersCodeTiroirPrincipal = convertirVersCodeTiroirPrincipal;
window.chercherTiroirDansArmoires = chercherTiroirDansArmoires;
window.colorerTiroirParOutillage = colorerTiroirParOutillage;
window.rechercherParCodeAmeliore = rechercherParCodeAmeliore;
window.inspectorTiroirsBlender = inspectorTiroirsBlender;
window.reinitialiserCouleurs = reinitialiserCouleurs;

// ------------------- DEBUG HELPERS  -------------------
Object.defineProperty(window, 'outillageParEmplacement', { get: () => outillageParEmplacement });
Object.defineProperty(window, 'outillageEmplacements', { get: () => outillageEmplacements });
Object.defineProperty(window, 'loadedArmoire1', { get: () => loadedArmoire1 });
Object.defineProperty(window, 'loadedArmoire2', { get: () => loadedArmoire2 });

//  debugTester pour gérer la nouvelle structure avec tableaux
window.debugTester = function(code) {
  console.log('--- debugTester pour:', code);
  const normIn = (code||'').toString().trim().toUpperCase();
  console.log('input normalisé:', JSON.stringify(normIn));
  console.log('outillageParEmplacement size:', Object.keys(outillageParEmplacement).length);

  let found = false;
  for (const [emplacement, infos] of Object.entries(outillageParEmplacement)) {
    // infos est maintenant un tableau d'outillages
    if (Array.isArray(infos)) {
      for (const info of infos) {
        const codeBDD = (info && info.Code) ? info.Code.toString() : '';
        const normBDD = codeBDD.trim().toUpperCase();
        if (normBDD === normIn) {
          console.log('→ MATCH EXACT:', emplacement, codeBDD, info);
          found = true; break;
        }
        if (normBDD.replace(/\s+/g,'') === normIn.replace(/\s+/g,'')) {
          console.log('→ MATCH SANS ESPACES:', emplacement, codeBDD, info);
          found = true; break;
        }
        if (normBDD.includes(normIn) || normIn.includes(normBDD)) {
          console.log('→ MATCH PARTIEL:', emplacement, codeBDD, info);
          found = true; break;
        }
      }
    } else if (infos) {
      // Fallback pour les objets simples (ancienne structure)
      const codeBDD = (infos && infos.Code) ? infos.Code.toString() : '';
      const normBDD = codeBDD.trim().toUpperCase();
      if (normBDD === normIn) {
        console.log('→ MATCH EXACT (objet simple):', emplacement, codeBDD, infos);
        found = true;
      }
    }
    if (found) break;
  }
  if (!found) {
    console.log('→ AUCUN MATCH TROUVÉ pour:', code);
    const suspects = Object.entries(outillageParEmplacement).filter(([empl,infos]) => {
      if (Array.isArray(infos)) {
        return infos.some(info => (info.Code||'').toString().includes(code));
      } else {
        return (infos.Code||'').toString().includes(code);
      }
    }).slice(0,10);
    console.log('Entrées contenant la chaîne recherchée (jusqu\'à 10):', suspects);
  }
  return found;
};

// ANIMATION avec rotation globale conditionnelle 
function animate() {
  requestAnimationFrame(animate);
  
  // Synchroniser les effets de background
  syncBackgroundEffects();
  
  // Gestion de l'animation 360°
  if (isAnimating360) {
    const elapsed = Date.now() - animationStartTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // Courbe d'animation ease-out pour un mouvement plus naturel
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Rotation de 0 à 2π (360°)
    const targetRotation = initialRotationY + (easeProgress * Math.PI * 2);
    currentRotationY = targetRotation;
    
    if (progress >= 1) {
      // Animation terminée
      isAnimating360 = false;
      currentRotationY = initialRotationY; // Revenir à la position initiale
      targetRotationY = initialRotationY;
      
      // Réactiver les contrôles
      canvas.style.pointerEvents = 'auto';
      
      console.log('✅ Animation 360° terminée');
    }
  } else {
    // Animation normale de rotation manuelle
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
  }
  
  if (armoireGroup) {
    armoireGroup.rotation.y = currentRotationY;
  }
  
  renderer.render(scene, camera);
}

//  Démarrer l'animation
animate();

//  FONCTIONS DE DEBUG SUPPLÉMENTAIRES
console.log(`
🔧 FONCTIONS DE DEBUG COMPLÈTES DISPONIBLES:
═══════════════════════════════════════════════
• diagnosticComplet()           - Diagnostic complet
• afficherTousLesOutillages()   - Liste tous les outillages
• chercherCodesSimilaires('code') - Cherche des codes similaires  
• verifierStructureDonnees()    - Vérifie la structure
• testerConnexionBDD()          - Test la connexion BDD
• testerColoration('code')      - Test la coloration
• reinitialiserCouleurs()       - Remet les couleurs par défaut
• inspectorTiroirsBlender()     - Liste tous les tiroirs Blender
• debugTester('code')           - Test de correspondance simple
• rechercherParCodeAmeliore('code') - Test la recherche complète

💡 POUR DÉBUGGER VOTRE PROBLÈME:
1. diagnosticComplet()
2. testerColoration('OUT142256')  
3. Si échec: inspectorTiroirsBlender()
`);

// ehhh voila j ai fini mon site , ce fichier main.js est exactement ce que j ai aime dans mon site, car c est le cerveau du site 
//sans lui rien ne fonctionne pas plus .
//Ce site est developpe par le future ingenieure Oulkabous Safae.
//NB: ne pas oublier de mentionner mon nom
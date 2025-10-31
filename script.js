
const GIST_RAW_URL = "https://gist.githubusercontent.com/Lozanoroa/0bd06c7b7a4f932982e3889c1c2f049b/raw/2574f9c6e620bb68fd96e2a564526360690d4daf/recuerdos.json";
const GITHUB_TOKEN = "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";
const REPO = "Lozanoroa/RECUERDOS-DE-NUESTRA-BODA";
const BRANCH = "main";
const SITE_URL = "https://lozanoroa.github.io/RECUERDOS-DE-NUESTRA-BODA/";
const SECRET_PASSWORD = "Jonatanymichel";

let selectedFile = null;
let isAuthenticated = false;
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function openFilePicker() {
    document.getElementById('hiddenFileInput').click();
}

document.getElementById('hiddenFileInput').addEventListener('change', function(e) {
    if (e.target.files[0]) {
        selectedFile = e.target.files[0];
        document.getElementById('fileName').textContent = selectedFile.name;
        document.getElementById('uploadModal').style.display = 'flex';
    }
});

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    selectedFile = null;
    document.getElementById('fileName').textContent = '';
    document.getElementById('message').value = '';
    document.getElementById('uploadStatus').textContent = '';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
}

function requestPassword() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function requestPasswordForQR() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    if (input === SECRET_PASSWORD) {
        isAuthenticated = true;
        closePasswordModal();
        document.getElementById('galleryPage').style.display = 'block';
        document.getElementById('uploadPage').style.display = 'none';
        loadGallery();
    } else {
        alert('Contraseña incorrecta');
    }
}

function backToUpload() {
    document.getElementById('galleryPage').style.display = 'none';
    document.getElementById('uploadPage').style.display = 'block';
    isAuthenticated = false;
}

async function confirmUpload() {
    if (!selectedFile) return;

    const message = document.getElementById('message').value.trim();
    const wordCount = message.split(/\s+/).filter(w => w).length;
    if (wordCount > 200) {
        alert('El mensaje no puede tener más de 200 palabras.');
        return;
    }

    const status = document.getElementById('uploadStatus');
    status.textContent = 'Subiendo...';
    status.className = '';

    const file = selectedFile;
    const fileExt = file.name.split('.').pop();
    const fileName = `${new Date().toISOString().split('T')[0]}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const path = `recuerdos/${fileName}`;

    const reader = new FileReader();
    reader.onload = async () => {
        const content = reader.result.split(',')[1];

        try {
            await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Subida: ${fileName}`,
                    content: content,
                    branch: BRANCH
                })
            });

            const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

            const item = {
                url: url,
                message: message || "Recuerdo de la boda",
                type: file.type.startsWith('image') ? 'image' : 'video',
                timestamp: Date.now()
            };

            await saveToGist(item);

            status.textContent = '¡Subido con éxito!';
            status.className = 'success';
            setTimeout(() => {
                closeUploadModal();
                if (isAuthenticated) loadGallery();
            }, 1500);
        } catch (err) {
            console.error("Error subida:", err);
            status.textContent = 'Error: ' + err.message;
            status.className = 'error';
        }
    };
    reader.readAsDataURL(file);
}

async function saveToGist(newItem) {
    let items = [];
    try {
        const res = await fetch(GIST_RAW_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error("Gist no encontrado");
        items = await res.json();
    } catch (err) {
        console.error("Error cargando Gist:", err);
        items = [];
    }

    items.unshift(newItem);
    const updatedJson = JSON.stringify(items, null, 2);
    const gistId = GIST_RAW_URL.match(/\/([^\/]+)\/raw/)[1];

    try {
        await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: { "recuerdos.json": { content: updatedJson } }
            })
        });
    } catch (err) {
        console.error("Error actualizando Gist:", err);
    }
}

async function loadGallery() {
    if (!isAuthenticated) return;

    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '<p style="color:#666;">Cargando...</p>';

    try {
        const res = await fetch(GIST_RAW_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error("Gist no encontrado");
        const items = await res.json();

        gallery.innerHTML = '';
        if (items.length === 0) {
            gallery.innerHTML = '<p style="color:#888; font-style:italic;">Aún no hay recuerdos. ¡Sé el primero!</p>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item';

            let media = '';
            if (item.type === 'image') {
                media = `<img src="${item.url}" loading="lazy" style="width:100%; height:auto; max-height:180px; object-fit:cover; border-radius:10px;">`;
            } else {
                media = `<video src="${item.url}" controls preload="metadata" style="width:100%; height:auto; max-height:180px; object-fit:cover; border-radius:10px;"></video>`;
            }

            const btnText = isMobile ? 'Descargar' : 'Descargar con mensaje';
            media += `<a href="#" onclick="downloadItem('${item.url}', '${item.message.replace(/'/g, "\\'")}', '${item.type}')" class="download-btn">${btnText}</a>`;
            div.innerHTML = media + `<p style="margin-top:8px;">${item.message}</p>`;
            gallery.appendChild(div);
        });
    } catch (err) {
        console.error("Error cargando galería:", err);
        gallery.innerHTML = '<p style="color:red;">Error al cargar. Revisa el Gist.</p>';
    }
}

async function downloadItem(url, message, type) {
    const response = await fetch(url);
    const blob = await response.blob();
    const fileName = url.split('/').pop();

    if (isMobile) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    } else {
        const zip = new JSZip();
        zip.file("mensaje.txt", message);
        zip.file(fileName, blob);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "recuerdo_con_mensaje.zip");
    }
}

// === QR ÚNICO + DESCARGA AUTOMÁTICA ===
function generateQR() {
    if (!isAuthenticated) {
        requestPasswordForQR();
        return;
    }

    const uniqueId = Math.random().toString(36).substr(2, 9);
    const uniqueUrl = `${SITE_URL}?id=${uniqueId}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(uniqueUrl)}&color=000000&bgcolor=FFFFFF&format=png&margin=20`;

    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = `
        <p style="margin-bottom:12px;color:#6D4C41;font-weight:bold;">Tu QR único</p>
        <img src="${qrApi}" alt="QR Único" id="qrImage">
        <p style="margin-top:14px; color:#6D4C41;">
            Descargando automáticamente...
        </p>
    `;

    // DESCARGA AUTOMÁTICA
    const img = document.getElementById('qrImage');
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
            saveAs(blob, `QR_Invitado_${uniqueId}.png`);
        });
    };
}

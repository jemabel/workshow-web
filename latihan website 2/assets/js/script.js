// ============================================
//  1. Active Nav & Typing Animation — IntersectionObserver
// ============================================

const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-item, .sidebar__item');
const navLinks = document.querySelectorAll('.sidebar__link');

// Typing Animation State untuk Heading About
const aboutHeading = document.querySelector('.about__heading');
const textToType = "Hi, I'm Abel Jemima";
let hasTypedAbout = false;

// Bersihkan teks awal heading agar siap diketik saat #about terlihat
if (aboutHeading) {
    aboutHeading.textContent = '';
}

function startTypingAnimation() {
    if (hasTypedAbout || !aboutHeading) return;
    hasTypedAbout = true;

    aboutHeading.innerHTML = '<span class="about__typed-text"></span><span class="about__cursor">|</span>';
    const textSpan = aboutHeading.querySelector('.about__typed-text');
    let charIndex = 0;
    const speed = 80; // 70-90 ms per karakter sesuai spesifikasi

    function typeChar() {
        if (charIndex < textToType.length) {
            textSpan.textContent += textToType.charAt(charIndex);
            charIndex++;
            setTimeout(typeChar, speed);
        }
    }

    typeChar();
}

// Opsi observer dengan threshold 0.5 sesuai spesifikasi
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        // Saat section terlihat minimal 50% di viewport
        if (entry.isIntersecting) {
            const currentId = entry.target.getAttribute('id');

            // 1. Hapus class .active dari semua .nav-item dan link (mencegah aktif ganda)
            navItems.forEach(item => item.classList.remove('active'));
            navLinks.forEach(link => link.classList.remove('active'));

            // 2. Cari link yang href-nya sesuai dengan id section
            const activeLink = document.querySelector(`.sidebar__link[href="#${currentId}"]`);

            // 3. Tambahkan class .active ke link tersebut
            if (activeLink) {
                activeLink.classList.add('active');
                const parentItem = activeLink.closest('.nav-item, .sidebar__item');
                if (parentItem) {
                    parentItem.classList.add('active');
                }
            }

            // 4. Trigger typing animation saat section #about terlihat (hanya dijalankan 1 kali)
            if (currentId === 'about') {
                startTypingAnimation();
            }
        }
    });
}, observerOptions);

// Daftarkan semua section (#home, #about, #project, #contact) ke observer
sections.forEach(section => observer.observe(section));

// Dukungan interaksi klik langsung dengan smooth scrolling
navLinks.forEach(link => {
    link.addEventListener('click', function () {
        navItems.forEach(item => item.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        const parent = this.closest('.nav-item, .sidebar__item');
        if (parent) parent.classList.add('active');
    });
});


// ============================================
//  2. Eye Tracking — Sprite Switching
//     Menggunakan 9 gambar arah pandangan
// ============================================

const charSprite   = document.getElementById('charSprite');
const characterWrap = document.getElementById('characterWrap');

if (charSprite && characterWrap) {

    // Mapping arah → nama file sprite
    const SPRITES = {
        'center':     'assets/image/char-center.png',
        'up':         'assets/image/char-up.png',
        'down':       'assets/image/char-down.png',
        'left':       'assets/image/char-left.png',
        'right':      'assets/image/char-right.png',
        'up-left':    'assets/image/char-up-left.png',
        'up-right':   'assets/image/char-up-right.png',
        'down-left':  'assets/image/char-down-left.png',
        'down-right': 'assets/image/char-down-right.png',
    };

    // Preload semua sprite supaya ganti gambar instan, tidak flicker
    Object.values(SPRITES).forEach(src => {
        const img = new Image();
        img.src = src;
    });

    let currentDirection = 'center';
    let rafId = null;
    let targetMouseX = window.innerWidth / 2;
    let targetMouseY = window.innerHeight / 2;

    // Ambil rect karakter secara lazy (cached, update on resize)
    let charRect = null;
    function updateRect() {
        charRect = characterWrap.getBoundingClientRect();
    }
    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });

    // Hitung pusat karakter
    function getCharCenter() {
        if (!charRect) updateRect();
        return {
            x: charRect.left + charRect.width  * 0.5,
            // Titik mata diperkirakan di 30% atas gambar
            y: charRect.top  + charRect.height * 0.30,
        };
    }

    // Tentukan arah dari sudut (atan2)
    function getDirection(mouseX, mouseY) {
        const center = getCharCenter();
        const dx = mouseX - center.x;
        const dy = mouseY - center.y;

        // Jarak dari pusat — kalau kursor sangat dekat, tetap center
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) return 'center';

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // angle: -180 s.d. 180 (kanan = 0, bawah = 90, kiri = ±180, atas = -90)

        // Bagi menjadi 8 sektor + center
        // Ambil sudut relatif terhadap 45° per sektor
        if (angle >= -22.5  && angle <  22.5)  return 'right';
        if (angle >=  22.5  && angle <  67.5)  return 'down-right';
        if (angle >=  67.5  && angle < 112.5)  return 'down';
        if (angle >= 112.5  && angle < 157.5)  return 'down-left';
        if (angle >= 157.5  || angle < -157.5) return 'left';
        if (angle >= -157.5 && angle < -112.5) return 'up-left';
        if (angle >= -112.5 && angle <  -67.5) return 'up';
        if (angle >= -67.5  && angle <  -22.5) return 'up-right';
        return 'center';
    }

    // Ganti sprite kalau arah berubah
    function updateSprite(dir) {
        if (dir === currentDirection) return;
        currentDirection = dir;
        const src = SPRITES[dir];
        if (src && charSprite.src !== src && !charSprite.src.endsWith(src)) {
            charSprite.src = src;
        }
    }

    // Mouse move — simpan posisi, proses via rAF
    document.addEventListener('mousemove', (e) => {
        targetMouseX = e.clientX;
        targetMouseY = e.clientY;

        if (rafId) return; // sudah ada frame yang pending
        rafId = requestAnimationFrame(() => {
            rafId = null;
            // Update rect sekali per frame (performa)
            charRect = characterWrap.getBoundingClientRect();
            const dir = getDirection(targetMouseX, targetMouseY);
            updateSprite(dir);
        });
    }, { passive: true });

    // Kursor keluar window — kembali ke center
    document.addEventListener('mouseleave', () => {
        updateSprite('center');
    });

    // Touch support (mobile) — gunakan posisi jari
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const t = e.touches[0];
            charRect = characterWrap.getBoundingClientRect();
            updateSprite(getDirection(t.clientX, t.clientY));
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        updateSprite('center');
    }, { passive: true });
}


// ============================================
//  3. Lanyard Draggable Interaction
//     Support Mouse & Touch, Spring Physics on Release
// ============================================

const lanyardImg = document.querySelector('.about__lanyard-img');

if (lanyardImg) {
    let currentX = 0;
    let currentY = 0;
    let currentRotate = 0;

    let isDragging = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;

    let lastPointerX = 0;
    let lastTime = 0;
    let horizontalVelocity = 0;

    let springRafId = null;

    // Cegah native ghost image drag default browser
    lanyardImg.addEventListener('dragstart', (e) => e.preventDefault());

    // Helper untuk mengambil posisi kursor/sentuhan
    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onDragStart(e) {
        // Hanya tangani klik kiri untuk mouse
        if (e.type === 'mousedown' && e.button !== 0) return;

        // Cegah seleksi teks dan aksi bawaan
        if (e.cancelable) e.preventDefault();

        // Hentikan animasi spring bila sedang berayun
        if (springRafId) {
            cancelAnimationFrame(springRafId);
            springRafId = null;
        }

        isDragging = true;
        lanyardImg.classList.add('is-dragging');
        document.body.classList.add('is-lanyard-dragging');

        const pos = getPointerPos(e);
        startPointerX = pos.x;
        startPointerY = pos.y;
        lastPointerX = pos.x;
        lastTime = performance.now();

        // Simpan posisi translate saat ini agar tidak loncat saat mulai drag
        initialTranslateX = currentX;
        initialTranslateY = currentY;
        horizontalVelocity = 0;

        // Pasang listener global saat drag berlangsung
        window.addEventListener('mousemove', onDragMove, { passive: false });
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchmove', onDragMove, { passive: false });
        window.addEventListener('touchend', onDragEnd);
        window.addEventListener('touchcancel', onDragEnd);
    }

    function onDragMove(e) {
        if (!isDragging) return;

        // Cegah default scrolling mobile saat sedang aktif men-drag gambar lanyard
        if (e.cancelable) e.preventDefault();

        const pos = getPointerPos(e);
        const now = performance.now();
        const dt = Math.max(1, now - lastTime);

        // Hitung perpindahan dari titik awal klik
        const deltaX = pos.x - startPointerX;
        const deltaY = pos.y - startPointerY;

        currentX = initialTranslateX + deltaX;
        currentY = initialTranslateY + deltaY;

        // Hitung kecepatan horizontal untuk kemiringan rotasi dinamis
        const moveStepX = pos.x - lastPointerX;
        horizontalVelocity = moveStepX / dt;

        // Batasi rotasi maksimum -30 sampai 30 derajat
        const targetRotate = Math.max(-30, Math.min(30, horizontalVelocity * 45));
        
        // Easing rotasi agar pergerakan miring badge halus dan responsif
        currentRotate += (targetRotate - currentRotate) * 0.3;

        lastPointerX = pos.x;
        lastTime = now;

        // Render transformasi CSS
        lanyardImg.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px) rotate(${currentRotate.toFixed(2)}deg)`;
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;

        lanyardImg.classList.remove('is-dragging');
        document.body.classList.remove('is-lanyard-dragging');

        // Lepas listener global
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onDragMove);
        window.removeEventListener('touchend', onDragEnd);
        window.removeEventListener('touchcancel', onDragEnd);

        // Spring-back animation:
        // - Posisi terakhir (currentX, currentY) TETAP
        // - Rotasi kembali ke 0 derajat dengan elastic / spring-like physics
        let rotVelocity = (currentRotate > 0 ? -1 : 1) * Math.min(Math.abs(currentRotate) * 0.35, 5);
        const stiffness = 0.08;
        const damping = 0.82;

        function springAnimation() {
            if (isDragging) return;

            // Gaya pegas elastis menuju 0 derajat
            const force = (0 - currentRotate) * stiffness;
            rotVelocity = (rotVelocity + force) * damping;
            currentRotate += rotVelocity;

            lanyardImg.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px) rotate(${currentRotate.toFixed(2)}deg)`;

            // Terus osilasi selama masih ada ayunan yang terlihat
            if (Math.abs(currentRotate) > 0.05 || Math.abs(rotVelocity) > 0.05) {
                springRafId = requestAnimationFrame(springAnimation);
            } else {
                currentRotate = 0;
                lanyardImg.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px) rotate(0deg)`;
                springRafId = null;
            }
        }

        springRafId = requestAnimationFrame(springAnimation);
    }

    // Pasang listener awal pada gambar lanyard (hanya bereaksi saat lanyard disentuh)
    lanyardImg.addEventListener('mousedown', onDragStart);
    lanyardImg.addEventListener('touchstart', onDragStart, { passive: false });
}


// ============================================
//  4. Projects Horizontal Slider
//     Scroll-snap & scrollBy navigation
// ============================================

const projectTrack = document.getElementById('projectTrack');
const projectPrevBtn = document.getElementById('projectPrevBtn');
const projectNextBtn = document.getElementById('projectNextBtn');

if (projectTrack && projectPrevBtn && projectNextBtn) {
    function getScrollStep() {
        const firstCard = projectTrack.querySelector('.projects__card');
        if (!firstCard) return 320;
        const style = window.getComputedStyle(projectTrack);
        const gap = parseFloat(style.columnGap || style.gap) || 28;
        return firstCard.offsetWidth + gap;
    }

    projectPrevBtn.addEventListener('click', () => {
        projectTrack.scrollBy({
            left: -getScrollStep(),
            behavior: 'smooth'
        });
    });

    projectNextBtn.addEventListener('click', () => {
        projectTrack.scrollBy({
            left: getScrollStep(),
            behavior: 'smooth'
        });
    });
}


// ============================================
//  5. Project Popup Modal
//     Opens full screen modal on card preview click
//     Fade + scale animation, close via X, overlay, or Escape
// ============================================

const projectModal = document.getElementById('projectModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalPreviewInner = document.getElementById('modalPreviewInner');
const modalNumber = document.getElementById('modalNumber');
const modalTitle = document.getElementById('modalTitle');
const modalCategory = document.getElementById('modalCategory');

if (projectModal && modalOverlay && modalCloseBtn) {
    let lastActiveElement = null;

    function isModalOpen() {
        return projectModal.classList.contains('is-open');
    }

    function openModal(card) {
        lastActiveElement = document.activeElement;

        // Ambil data dari card yang diklik
        if (card) {
            const titleEl = card.querySelector('.projects__card-title');
            const categoryEl = card.querySelector('.projects__card-category');
            const numberEl = card.querySelector('.projects__card-number');
            const previewEl = card.querySelector('.projects__card-preview');

            if (modalTitle && titleEl) {
                modalTitle.textContent = titleEl.textContent.trim();
            }
            if (modalCategory && categoryEl) {
                modalCategory.textContent = categoryEl.textContent.trim();
            }
            if (modalNumber && numberEl) {
                modalNumber.textContent = numberEl.textContent.trim();
            }

            // Tampilkan gambar / icon project lebih besar di modal
            if (modalPreviewInner && previewEl) {
                const img = previewEl.querySelector('img');
                const icon = previewEl.querySelector('.projects__card-icon, i');

                if (img) {
                    modalPreviewInner.innerHTML = `<img src="${img.src}" alt="${img.alt || (titleEl ? titleEl.textContent.trim() : 'Project Image')}" class="project-modal__image">`;
                } else if (icon) {
                    const iconClasses = Array.from(icon.classList).filter(c => c !== 'projects__card-icon').join(' ');
                    modalPreviewInner.innerHTML = `<i class="${iconClasses} project-modal__icon" aria-hidden="true"></i>`;
                } else {
                    modalPreviewInner.innerHTML = previewEl.innerHTML;
                }
            }
        }

        projectModal.classList.add('is-open');
        projectModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        // Fokus ke tombol close demi aksesibilitas
        setTimeout(() => {
            modalCloseBtn.focus();
        }, 50);
    }

    function closeModal() {
        if (!isModalOpen()) return;

        projectModal.classList.remove('is-open');
        projectModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        // Kembalikan fokus ke elemen pemicu sebelumnya
        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
        }
    }

    // 1. Tutup dengan klik tombol close (X)
    modalCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });

    // 2. Tutup dengan klik area overlay di luar content
    modalOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });

    // Dukungan klik backdrop pembungkus di luar content
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            closeModal();
        }
    });

    // Cegah klik di dalam content modal menutup popup
    const modalContent = projectModal.querySelector('.project-modal__content');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 3. Tutup dengan tombol Escape pada keyboard
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Escape' || e.key === 'Esc') && isModalOpen()) {
            closeModal();
        }
    });

    // Pasang listener pada seluruh kartu project & area preview gambar
    const projectCards = document.querySelectorAll('.projects__card');
    projectCards.forEach(card => {
        const preview = card.querySelector('.projects__card-preview');

        if (preview) {
            // Klik area gambar pada project card
            preview.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(card);
            });

            // Navigasi keyboard (Enter atau Spasi) pada area preview
            preview.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openModal(card);
                }
            });
        }

        // Klik area card di luar preview juga membuka modal
        // CATATAN: listener ini sengaja dipisah dari preview agar tidak double-trigger.
        // e.stopPropagation() di preview mencegah event ini terpanggil saat preview diklik.
        card.addEventListener('click', (e) => {
            // Hanya buka modal jika klik bukan dari area preview (yang sudah handle sendiri)
            if (!e.target.closest('.projects__card-preview')) {
                openModal(card);
            }
        });
    });
}


// ============================================
//  6. Contact Envelope CTA Interaction
//     Toggle open on touch/click for mobile devices & keyboard
// ============================================

const contactEnvelope = document.getElementById('contactEnvelope');

if (contactEnvelope) {
    contactEnvelope.addEventListener('click', (e) => {
        // Jika klik tombol email langsung, biarkan membuka mailto tanpa gangguan
        if (e.target.closest('#contactEmailBtn, .envelope__letter-btn')) {
            return;
        }
        contactEnvelope.classList.toggle('is-open');
    });

    // Tutup amplop jika pengguna mengklik di luar amplop
    document.addEventListener('click', (e) => {
        if (!contactEnvelope.contains(e.target)) {
            contactEnvelope.classList.remove('is-open');
        }
    });

    // Dukungan aksesibilitas keyboard (Enter atau Spasi)
    contactEnvelope.addEventListener('keydown', (e) => {
        if (e.target === contactEnvelope && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            contactEnvelope.classList.toggle('is-open');
        }
    });
}




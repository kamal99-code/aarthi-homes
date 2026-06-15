/* ==========================================================================
   AARTHI HOMES Kodaikanal - JS CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Date fields
    const quickCheckin = document.getElementById('quick-checkin');
    const quickCheckout = document.getElementById('quick-checkout');
    const quickBookingForm = document.getElementById('quick-booking-form');
    
    const mainCheckin = document.getElementById('booking-checkin');
    const mainCheckout = document.getElementById('booking-checkout');
    const mainGuests = document.getElementById('booking-guests');
    const mainRoom = document.getElementById('booking-room-select');
    const bookingForm = document.getElementById('booking-inquiry-form');
    
    const checkinError = document.getElementById('checkin-error');
    const checkoutError = document.getElementById('checkout-error');

    // Room Modals
    const roomModal = document.getElementById('room-modal');
    const modalClose = document.getElementById('modal-close');
    const modalContent = document.getElementById('modal-content');
    const roomDetailsBtns = document.querySelectorAll('.room-details-btn');

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const galleryItems = document.querySelectorAll('.gallery-item');

    // Success Modal
    const successModal = document.getElementById('success-modal');
    const successCloseBtn = document.getElementById('success-close-btn');
    
    let currentGalleryIndex = 0;
    const galleryData = [];

    // --- Populate Gallery Data Array ---
    galleryItems.forEach((item, index) => {
        const img = item.querySelector('img');
        const h3 = item.querySelector('h3');
        galleryData.push({
            src: item.getAttribute('data-src') || img.src,
            alt: img.alt,
            title: h3 ? h3.innerText : 'Aarthi Homes Gallery'
        });
        
        // Add click listener
        item.addEventListener('click', () => {
            openLightbox(index);
        });
    });

    // --- Header Scroll State ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Active Link Highlighting
        let currentSectionId = '';
        const sections = document.querySelectorAll('section, header');
        const scrollPosition = window.scrollY + 120;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < (sectionTop + sectionHeight)) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // --- Mobile Menu Toggle ---
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });

    // Close mobile nav when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('open');
            navMenu.classList.remove('open');
        });
    });

    // --- Room Modals Data ---
    const roomDetailsData = {
        deluxe: {
            title: 'Deluxe Balcony Suite',
            type: 'Premium Accommodation',
            img: 'assets/bedroom.jpg',
            fallbackImg: 'https://images.unsplash.com/photo-1611891487122-2075b96244e1?auto=format&fit=crop&w=600&q=80',
            desc: 'Our Deluxe Balcony Suite highlights high-end interior craftsmanship. Adorned with warm light-oak wood panels, a gorgeous custom-designed pink leaf-pattern mural, and ambient hidden ceiling LED lights, this suite provides absolute comfort. It includes a writing desk, built-in wardrobes, a dedicated electric kettle, a space heater, and custom embroidered white linens featuring the Aarthi Homes logo. Sliding glass doors lead you directly onto your private balcony overlooking Kodaikanal\'s terraced hills.',
            specs: {
                size: '400 sq. ft.',
                occupancy: '2 Adults (Extra bed available)',
                bed: 'King Size Double Bed',
                view: 'Scenic Valleys & Step Farms'
            },
            price: '₹4,500'
        },
        valley: {
            title: 'Pine Valley Cottage',
            type: 'Hillside Cottage Suite',
            img: 'assets/balcony.jpg',
            fallbackImg: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80',
            desc: 'The Pine Valley Cottage focuses on integrating the gorgeous outdoor environment of Attuvampatti with modern indoor comfort. Complete with comfy indoor armchairs and local wood tables, this suite has high ceilings and large windows that invite the morning mist inside. Step onto the balcony and settle into the minimalist outdoor seating with a hot cup of coffee to gaze at the winding paths and step-farming structures below. It connects directly with the clay jaali brick walk.',
            specs: {
                size: '450 sq. ft.',
                occupancy: '2-3 Adults',
                bed: 'Super King Size Double Bed',
                view: 'Mountain Valleys & Pine Forest'
            },
            price: '₹5,200'
        },
        terrace: {
            title: 'Terrace View Suite',
            type: 'Garden Level Suite',
            img: 'assets/08.jpg',
            fallbackImg: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
            desc: 'The Terrace View Suite offers a unique blend of heritage architecture and contemporary utility. Located on the ground level, right next to the gorgeous brick-red jaali screens, it boasts an outdoor pathway view. The interior features rich oak framing, a large built-in dressing mirror, a separate leather seating chair, a functional study/makeup desk, custom logo towels, and a dedicated space heater for cool nights. Ideal for travelers wanting easy outdoor garden access.',
            specs: {
                size: '350 sq. ft.',
                occupancy: '2 Adults',
                bed: 'Standard Double Bed',
                view: 'Terracotta Corridor & Garden'
            },
            price: '₹4,000'
        }
    };

    // Open Room Detail Modal
    roomDetailsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const roomType = btn.getAttribute('data-room');
            const data = roomDetailsData[roomType];
            if (data) {
                populateRoomModal(data);
                roomModal.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    function populateRoomModal(data) {
        modalContent.innerHTML = `
            <div class="modal-img-section">
                <img src="${data.img}" alt="${data.title}" class="img-responsive" onerror="this.src='${data.fallbackImg}'">
            </div>
            <div class="modal-info-section">
                <span class="modal-room-type">${data.type}</span>
                <h2>${data.title}</h2>
                <p class="modal-desc">${data.desc}</p>
                <div class="modal-specs">
                    <div class="spec-item"><strong>Room Area</strong>${data.specs.size}</div>
                    <div class="spec-item"><strong>Max Occupancy</strong>${data.specs.occupancy}</div>
                    <div class="spec-item"><strong>Bed Options</strong>${data.specs.bed}</div>
                    <div class="spec-item"><strong>Scenic View</strong>${data.specs.view}</div>
                </div>
                <div class="modal-cta-box">
                    <a href="#contact" class="btn btn-primary" id="modal-book-now-btn">Book Room</a>
                </div>
            </div>
        `;

        // Add booking link close listener
        document.getElementById('modal-book-now-btn').addEventListener('click', () => {
            closeRoomModal();
            // Select room type in main form
            if (mainRoom) {
                const mapOptions = { 'Deluxe Balcony Suite': 'deluxe', 'Pine Valley Cottage': 'valley', 'Terrace View Suite': 'terrace' };
                // Find matching option key
                for (let key in mapOptions) {
                    if (data.title === key) {
                        mainRoom.value = mapOptions[key];
                    }
                }
            }
        });
    }

    function closeRoomModal() {
        roomModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeRoomModal);
    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) closeRoomModal();
    });


    // --- Date Validation & Quick Bar Sync ---
    
    // Set minimum check-in date to today
    const today = new Date().toISOString().split('T')[0];
    if (quickCheckin && mainCheckin) {
        quickCheckin.min = today;
        mainCheckin.min = today;
    }

    // Set check-out minimum based on check-in date
    function updateCheckoutMin(checkinElem, checkoutElem) {
        if (checkinElem.value) {
            const checkinDate = new Date(checkinElem.value);
            checkinDate.setDate(checkinDate.getDate() + 1); // Minimum 1 night stay
            const nextDayStr = checkinDate.toISOString().split('T')[0];
            checkoutElem.min = nextDayStr;
            
            // If check-out is currently equal or before new minimum, adjust it
            if (checkoutElem.value && checkoutElem.value < nextDayStr) {
                checkoutElem.value = nextDayStr;
            }
        }
    }

    if (quickCheckin && quickCheckout) {
        quickCheckin.addEventListener('change', () => updateCheckoutMin(quickCheckin, quickCheckout));
    }
    if (mainCheckin && mainCheckout) {
        mainCheckin.addEventListener('change', () => updateCheckoutMin(mainCheckin, mainCheckout));
    }

    // Quick booking form submission (redirects and syncs with main form)
    if (quickBookingForm) {
        quickBookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Sync values to main form
            if (mainCheckin) mainCheckin.value = quickCheckin.value;
            if (mainCheckout) {
                updateCheckoutMin(mainCheckin, mainCheckout);
                mainCheckout.value = quickCheckout.value;
            }
            if (mainGuests) {
                const guestsVal = document.getElementById('quick-guests').value;
                mainGuests.value = guestsVal;
            }
            if (mainRoom) {
                const roomVal = document.getElementById('quick-room').value;
                mainRoom.value = roomVal;
            }

            // Scroll smoothly to contact section
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
                // Briefly flash background of the form to highlight
                const formWrapper = document.querySelector('.contact-form-wrapper');
                formWrapper.style.transform = 'scale(1.02)';
                formWrapper.style.borderColor = 'var(--primary-wood)';
                setTimeout(() => {
                    formWrapper.style.transform = 'scale(1)';
                    formWrapper.style.borderColor = 'var(--border-color)';
                }, 800);
            }
        });
    }


    // --- Lightbox Functionality ---
    function openLightbox(index) {
        currentGalleryIndex = index;
        updateLightboxImage();
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxImage() {
        const item = galleryData[currentGalleryIndex];
        if (item) {
            lightboxImg.src = item.src;
            lightboxImg.alt = item.alt;
            lightboxCaption.innerText = item.title;
        }
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
    }

    function prevLightbox() {
        currentGalleryIndex = (currentGalleryIndex - 1 + galleryData.length) % galleryData.length;
        updateLightboxImage();
    }

    function nextLightbox() {
        currentGalleryIndex = (currentGalleryIndex + 1) % galleryData.length;
        updateLightboxImage();
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevLightbox(); });
    lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextLightbox(); });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxImg || e.target.closest('.lightbox-content')) {
            // Click outside buttons closes
            if (e.target !== lightboxPrev && e.target !== lightboxNext) {
                closeLightbox();
            }
        }
    });

    // Keyboard support for Lightbox and Modals
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevLightbox();
            if (e.key === 'ArrowRight') nextLightbox();
        }
        if (roomModal.classList.contains('open')) {
            if (e.key === 'Escape') closeRoomModal();
        }
        if (successModal.classList.contains('open')) {
            if (e.key === 'Escape') closeSuccessModal();
        }
    });


    // --- Form validation and Mock Submission ---
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Clear prior validation errors
            let isValid = true;
            document.querySelectorAll('.form-group').forEach(grp => grp.classList.remove('has-error'));
            
            const checkinVal = mainCheckin.value;
            const checkoutVal = mainCheckout.value;
            
            // Verify Dates logic
            if (!checkinVal) {
                isValid = false;
                mainCheckin.parentElement.classList.add('has-error');
                checkinError.innerText = 'Check-in date is required';
            }
            
            if (!checkoutVal) {
                isValid = false;
                mainCheckout.parentElement.classList.add('has-error');
                checkoutError.innerText = 'Check-out date is required';
            }
            
            if (checkinVal && checkoutVal) {
                const inDate = new Date(checkinVal);
                const outDate = new Date(checkoutVal);
                
                if (outDate <= inDate) {
                    isValid = false;
                    mainCheckout.parentElement.classList.add('has-error');
                    checkoutError.innerText = 'Check-out must be after check-in';
                }
            }

            if (!isValid) return;

            // Gather inputs for success modal display and api dispatch
            const nameVal = document.getElementById('booking-name').value;
            const phoneVal = document.getElementById('booking-phone').value;
            const emailVal = document.getElementById('booking-email').value;
            const roomSelect = document.getElementById('booking-room-select');
            const roomText = roomSelect.options[roomSelect.selectedIndex].text;
            const guestsVal = document.getElementById('booking-guests').value || 1;
            const messageVal = document.getElementById('booking-message').value || "";
            
            const formatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const checkinFormatted = formatter.format(new Date(checkinVal));
            const checkoutFormatted = formatter.format(new Date(checkoutVal));

            // Compile request payload
            const inquiryData = {
                name: nameVal,
                phone: phoneVal,
                email: emailVal,
                room: roomText,
                checkin: checkinVal,
                checkout: checkoutVal,
                guests: parseInt(guestsVal, 10),
                comments: messageVal
            };

            // Submission state (disable button, show spinner/loading)
            const submitBtn = document.getElementById('submit-inquiry');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Processing your request...</span>';

            // Promises for API dispatch
            const apiDispatches = [];

            // 1. Dispatch to local server database backup
            apiDispatches.push(
                fetch('/api/inquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(inquiryData)
                }).then(res => {
                    if (!res.ok) console.warn('Local backup server responded with error status:', res.status);
                }).catch(err => console.warn('Local database logging failed:', err))
            );

            // 2. Dispatch to Google Sheets if Web App URL is configured
            const googleSheetUrl = localStorage.getItem('google_sheet_url');
            if (googleSheetUrl) {
                apiDispatches.push(
                    fetch(googleSheetUrl, {
                        method: 'POST',
                        mode: 'no-cors', // Bypasses CORS requirements for simple webhook dispatches
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(inquiryData)
                    }).then(() => {
                        console.log('Inquiry successfully synced with Google Sheets.');
                    }).catch(err => console.warn('Google Sheet synchronization failed:', err))
                );
            }

            // Execute dispatches and wait (with minimum visual display time for premium feel)
            const minWaitPromise = new Promise(resolve => setTimeout(resolve, 1200));
            
            Promise.all([...apiDispatches, minWaitPromise]).then(() => {
                // Success modal actions
                document.getElementById('success-client-name').innerText = nameVal;
                document.getElementById('success-room-type').innerText = roomText;
                document.getElementById('success-dates').innerText = `${checkinFormatted} to ${checkoutFormatted}`;
                document.getElementById('success-client-phone').innerText = phoneVal;

                // Open Success modal
                successModal.classList.add('open');
                document.body.style.overflow = 'hidden';

                // Reset forms
                bookingForm.reset();
                if (quickBookingForm) quickBookingForm.reset();
                
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            });
        });
    }

    function closeSuccessModal() {
        successModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    successCloseBtn.addEventListener('click', closeSuccessModal);
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) closeSuccessModal();
    });

});

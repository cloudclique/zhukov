document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('close-btn');

    // Fetch the images data
    fetch('images.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(images => {
            loading.style.display = 'none';
            if (images.length === 0) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = 'No images found in the gallery.';
                return;
            }
            
            // Generate HTML for each image
            images.forEach(image => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                const img = document.createElement('img');
                img.src = `pictures/${image.filename}`;
                img.alt = image.filename;
                img.loading = 'lazy'; // For performance on large galleries
                
                item.appendChild(img);
                gallery.appendChild(item);

                // Add click event for lightbox
                item.addEventListener('click', () => {
                    openLightbox(`pictures/${image.filename}`, image.filename);
                });
            });
        })
        .catch(error => {
            console.error('Error fetching images:', error);
            loading.style.display = 'none';
            errorMessage.style.display = 'block';
            errorMessage.innerHTML = 'Could not load gallery data.<br>Make sure you have run the sync script to generate images.json.';
        });

    // Lightbox functionality
    function openLightbox(src, caption) {
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightboxImg.src = '';
        }, 300); // Clear image after transition
        document.body.style.overflow = ''; // Restore scrolling
    }

    closeBtn.addEventListener('click', closeLightbox);
    
    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
});

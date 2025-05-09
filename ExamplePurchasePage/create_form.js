// Function to fetch product and price data from Supabase
async function fetchProductData(priceId) {
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzemRobGp3dWF3aGJ2c3J0d21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNzY4MDIsImV4cCI6MjA1Mzc1MjgwMn0.p3NBab3uJOupZrKXjbDGfHnx-Lhrqsvqs6j07fLPgmk";

    const response = await fetch(`https://rszdhljwuawhbvsrtwmm.supabase.co/rest/v1/prices?price_id=eq.${priceId}`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        },
        method: 'GET'
    });
    
    if (!response.ok) {
        console.log(response)
        throw new Error('Failed to fetch price data');
    }

    const prices = await response.json();
    const price = prices.find(p => p.price_id === priceId);
    
    if (!price) return null;

    // Fetch the associated product
    const productResponse = await fetch(`https://rszdhljwuawhbvsrtwmm.supabase.co/rest/v1/products?product_id=eq.${price.product_id}`, {
        headers: {
            'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzemRobGp3dWF3aGJ2c3J0d21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNzY4MDIsImV4cCI6MjA1Mzc1MjgwMn0.p3NBab3uJOupZrKXjbDGfHnx-Lhrqsvqs6j07fLPgmk",
            'Content-Type': 'application/json'
        }
    });

    if (!productResponse.ok) {
        throw new Error('Failed to fetch product data');
    }

    const [product] = await productResponse.json();
    return {
        ...price,
        image_url: product.image_url,
        product_description: product.description,
        product_name: product.product_name
    };
}

// Function to format price amount
function formatPrice(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(amount / 100); // Assuming amount is in cents
}

// Function to calculate total price
function calculateTotal(mainProduct, mainQuantity, addons, addonProducts) {
    let total = mainProduct.amount * mainQuantity;
    
    addons.forEach(addon => {
        const addonProduct = addonProducts.find(p => p.price_id === addon.id);
        if (addonProduct) {
            total += addonProduct.amount * (addon.quantity || 0);
        }
    });
    
    return total;
}

// Function to create valid HTML ID from UUID
function createValidId(prefix, uuid) {
    return `${prefix}-${uuid}`;
}

// Function to update the total price display
function updateTotalPrice(mainProduct, addons, addonProducts, submitButton) {
    const mainQuantity = document.getElementById('main-quantity')
        ? parseInt(document.getElementById('main-quantity').value) || 0
        : 1;

    const selectedAddons = [];
    addons.forEach(addon => {
        if (addon.purchase_type === 'single') {
            const checkbox = document.getElementById(createValidId('addon', addon.id));
            if (checkbox && checkbox.checked) {
                selectedAddons.push({ id: addon.id, quantity: 1 });
            }
        } else {
            const quantityInput = document.getElementById(createValidId('qty', addon.id));
            const quantity = parseInt(quantityInput?.value) || 0;
            if (quantity > 0) {
                selectedAddons.push({ id: addon.id, quantity });
            }
        }
    });

    const total = calculateTotal(mainProduct, mainQuantity, selectedAddons, addonProducts);
    submitButton.textContent = `Proceed to Checkout (${formatPrice(total, mainProduct.currency)})`;
}

// Function to create and handle the checkout form
async function createCheckoutForm() {
    const formContainer = document.createElement('div');
    formContainer.className = 'checkout-form';

    const title = document.createElement('h2');
    title.textContent = 'Your Order';
    formContainer.appendChild(title);

    try {
        // Fetch main product data
        const mainProduct = await fetchProductData(config.main_price.id);
        
        // Fetch all addon products data upfront
        const addonProducts = await Promise.all(
            config.addons.map(addon => fetchProductData(addon.id))
        );

        // Create main product section
        const mainProductSection = document.createElement('div');
        mainProductSection.className = 'main-product';
        
        const mainProductHtml = `
            <div class="product-card">
                <img src="${mainProduct.image_url}" alt="Main product" class="product-image">
                <div class="product-details">
                    <h3>${mainProduct.product_name}</h3>
                    <p class="description">${mainProduct.product_description}</p>
                    <p class="price">${formatPrice(mainProduct.amount, mainProduct.currency)}</p>
                    ${config.main_price.purchase_type === 'quantity' ? `
                        <div class="quantity-selector">
                            <label for="main-quantity">Quantity:</label>
                            <input type="number" id="main-quantity" min="1" value="1" class="quantity-input">
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        mainProductSection.innerHTML = mainProductHtml;
        formContainer.appendChild(mainProductSection);

        // Create addons section
        const addonsTitle = document.createElement('h3');
        addonsTitle.textContent = 'Available Add-ons';
        formContainer.appendChild(addonsTitle);

        const addonsContainer = document.createElement('div');
        addonsContainer.className = 'addons-container';

        // Create submit button early so we can reference it
        const submitButton = document.createElement('button');
        submitButton.className = 'checkout-submit';
        
        // Initial total price calculation
        updateTotalPrice(mainProduct, config.addons, addonProducts, submitButton);

        // Add event listener for main quantity changes
        if (config.main_price.purchase_type === 'quantity') {
            const mainQuantityInput = mainProductSection.querySelector('#main-quantity');
            mainQuantityInput.addEventListener('change', () => {
                updateTotalPrice(mainProduct, config.addons, addonProducts, submitButton);
            });
        }

        // Fetch and create checkbox for each addon
        for (const addon of config.addons) {
            const addonData = addonProducts.find(p => p.price_id === addon.id);
            if (!addonData) continue;

            const addonWrapper = document.createElement('div');
            addonWrapper.className = 'addon-item';
            
            const addonHtml = `
                <div class="addon-content">
                    ${addon.purchase_type === 'single' ? `
                        <input type="checkbox" id="${createValidId('addon', addon.id)}" value="${addon.id}" class="addon-checkbox">
                    ` : ''}
                    <div class="addon-details">
                        <img src="${addonData.image_url}" alt="Addon" class="addon-image">
                        <div class="addon-text">
                            <label for="${createValidId(addon.purchase_type === 'single' ? 'addon' : 'qty', addon.id)}">${addonData.product_name}</label>
                            <p class="description">${addonData.product_description}</p>
                            <p class="price">${formatPrice(addonData.amount, addonData.currency)}</p>
                        </div>
                        ${addon.purchase_type === 'quantity' ? `
                            <div class="quantity-selector">
                                <label for="${createValidId('qty', addon.id)}">Qty:</label>
                                <input type="number" 
                                       id="${createValidId('qty', addon.id)}" 
                                       min="0" 
                                       value="0" 
                                       class="quantity-input"
                                       data-price-id="${addon.id}">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            addonWrapper.innerHTML = addonHtml;
            addonsContainer.appendChild(addonWrapper);

            // Add event listeners for price updates
            if (addon.purchase_type === 'single') {
                const checkbox = addonWrapper.querySelector(`#${createValidId('addon', addon.id)}`);
                checkbox.addEventListener('change', () => {
                    updateTotalPrice(mainProduct, config.addons, addonProducts, submitButton);
                });
            } else {
                const quantityInput = addonWrapper.querySelector(`#${createValidId('qty', addon.id)}`);
                quantityInput.addEventListener('change', () => {
                    updateTotalPrice(mainProduct, config.addons, addonProducts, submitButton);
                });
            }
        }

        formContainer.appendChild(addonsContainer);
        formContainer.appendChild(submitButton);

        // Add form styles
        const styles = document.createElement('style');
        styles.textContent = `
            .checkout-form {
                max-width: 800px;
                margin: 20px auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .main-product {
                margin-bottom: 30px;
            }
            .product-card {
                display: flex;
                gap: 20px;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            .product-image, .addon-image {
                width: 120px;
                height: 120px;
                object-fit: cover;
                border-radius: 4px;
            }
            .product-details, .addon-details {
                flex: 1;
                position: relative;
            }
            .addons-container {
                margin: 20px 0;
            }
            .addon-item {
                margin: 10px 0;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            .addon-content {
                display: flex;
                align-items: flex-start;
                gap: 15px;
            }
            .addon-details {
                display: flex;
                gap: 15px;
                flex: 1;
            }
            .addon-text {
                flex: 1;
            }
            .price {
                font-weight: bold;
                color: #2c5282;
                margin-top: 8px;
            }
            .description {
                color: #4a5568;
                margin: 8px 0;
            }
            .checkout-submit {
                background: #4CAF50;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
                margin-top: 20px;
            }
            .checkout-submit:hover {
                background: #45a049;
            }
            h2, h3 {
                color: #2d3748;
                margin-bottom: 1rem;
            }
            .addon-checkbox {
                width: 20px;
                height: 20px;
                margin-top: 8px;
            }
            label {
                font-weight: 500;
                color: #2d3748;
            }
            .quantity-selector {
                position: absolute;
                bottom: 10px;
                right: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .quantity-input {
                width: 60px;
                padding: 4px;
                border: 1px solid #cbd5e0;
                border-radius: 4px;
                text-align: center;
            }
            .quantity-input:focus {
                outline: none;
                border-color: #4CAF50;
            }
        `;
        document.head.appendChild(styles);

        // Handle form submission
        console.log("yeet")
        submitButton.addEventListener('click', () => {
            const mainQuantity = config.main_price.purchase_type === 'quantity' 
                ? parseInt(document.getElementById('main-quantity').value) || 0
                : 1;

            // Only proceed if main quantity is valid
            if (mainQuantity === 0) {
                alert('Please select a quantity for the main product');
                return;
            }

            const selectedAddons = [];
            
            // Gather selected addons
            config.addons.forEach(addon => {
                if (addon.purchase_type === 'single') {
                    const checkbox = document.getElementById(createValidId('addon', addon.id));
                    if (checkbox && checkbox.checked) {
                        selectedAddons.push({id: addon.id, quantity: 1});
                    }
                } else {
                    const quantityInput = document.getElementById(createValidId('qty', addon.id));
                    const quantity = parseInt(quantityInput.value) || 0;
                    if (quantity > 0) {
                        selectedAddons.push({
                            id: addon.id,
                            quantity: quantity
                        });
                    }
                }
            });

            const order = {
                main_price: {
                    id: config.main_price.id,
                    quantity: mainQuantity
                },
                addons: selectedAddons
            };

            checkout(order);
        });

        // Add the form to the page
        document.body.appendChild(formContainer);
    } catch (error) {
        console.error('Error creating checkout form:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'There was an error loading the checkout form. Please try again later.';
        document.body.appendChild(errorMessage);
    }
}

// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', createCheckoutForm);

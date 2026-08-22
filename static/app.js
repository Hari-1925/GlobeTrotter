/**
 * GlobeTrotter - Front-end Interactivity & State Manager
 */

const API_BASE = ""; // Relative URL since frontend is mounted on FastAPI

// Core Application State
const state = {
    token: localStorage.getItem("gt_token") || null,
    user: null,
    trips: [],
    currentTrip: null,
    selectedStopId: null,
    cities: [],
    activeTab: "dashboard",
    activeSubView: "itinerary", // itinerary, calendar, budget
    calendarDate: new Date(),
    profileAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
};

// Global Initialization
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

// Main Setup Routing and Listeners
async function initApp() {
    setupEventListeners();
    
    // Check if URL has a public share token
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get("share");
    
    if (shareToken) {
        // Switch to public share mode immediately
        state.activeTab = "public-share";
        renderTabViews();
        loadPublicTrip(shareToken);
        return;
    }

    if (state.token) {
        // Attempt to fetch profile. If it fails, token is invalid/expired.
        const success = await fetchUserProfile();
        if (success) {
            showAppView();
            fetchSeededCities();
            fetchTrips();
        } else {
            logout();
        }
    } else {
        showLoginView();
    }
}

// Global Event Listeners Setup
function setupEventListeners() {
    // Auth Forms
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("signup-form").addEventListener("submit", handleSignup);
    document.getElementById("switch-to-signup").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthPanels("signup");
    });
    document.getElementById("switch-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthPanels("login");
    });
    document.getElementById("btn-forgot-password").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthPanels("forgot");
    });
    document.getElementById("forgot-back-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthPanels("login");
    });
    document.getElementById("btn-submit-forgot").addEventListener("click", (e) => {
        e.preventDefault();
        const email = document.getElementById("forgot-email").value;
        if (!email) {
            showToast("Please enter email address", "error");
            return;
        }
        showToast("Mock recovery email sent to " + email, "success");
        toggleAuthPanels("login");
    });

    // Profile Settings Form
    document.getElementById("profile-update-form").addEventListener("submit", handleProfileUpdate);
    document.getElementById("btn-delete-account").addEventListener("click", handleDeleteAccount);
    
    // Profile Avatars selection
    document.querySelectorAll(".avatar-opt").forEach(img => {
        img.addEventListener("click", (e) => {
            document.querySelectorAll(".avatar-opt").forEach(i => i.classList.remove("active"));
            e.target.classList.add("active");
            state.profileAvatarUrl = e.target.dataset.url;
            document.getElementById("profile-avatar-big").src = state.profileAvatarUrl;
        });
    });

    // Navigation Menu Tabs
    document.querySelectorAll(".sidebar-menu .menu-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
    document.getElementById("btn-logout").addEventListener("click", logout);

    // Trip Modal Triggers
    document.getElementById("btn-new-trip-top").addEventListener("click", () => openTripModal());
    document.getElementById("btn-new-trip-hero").addEventListener("click", () => openTripModal());
    document.getElementById("btn-close-trip-modal").addEventListener("click", closeTripModal);
    document.getElementById("btn-cancel-trip-modal").addEventListener("click", closeTripModal);
    document.getElementById("trip-form").addEventListener("submit", handleTripSubmit);

    // Suggest quick cover images
    document.querySelectorAll(".suggest-chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
            document.querySelectorAll(".suggest-chip").forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            document.getElementById("trip-cover-input").value = e.target.dataset.url;
        });
    });

    // Subtab inside Trip details (Itinerary, Calendar, Budget)
    document.querySelectorAll(".trip-sub-nav .sub-nav-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".trip-sub-nav .sub-nav-btn").forEach(b => b.classList.remove("active"));
            e.currentTarget.classList.add("active");
            state.activeSubView = e.currentTarget.dataset.subview;
            renderTripSubViews();
        });
    });

    // Modal Stops triggers
    document.getElementById("btn-close-stop-modal").addEventListener("click", () => toggleModal("modal-stop", false));
    document.getElementById("btn-cancel-stop-modal").addEventListener("click", () => toggleModal("modal-stop", false));
    document.getElementById("stop-form").addEventListener("submit", handleStopSubmit);

    // Modal Custom Activity triggers
    document.getElementById("btn-close-custom-modal").addEventListener("click", () => toggleModal("modal-custom-activity", false));
    document.getElementById("btn-cancel-custom-modal").addEventListener("click", () => toggleModal("modal-custom-activity", false));
    document.getElementById("custom-activity-form").addEventListener("submit", handleCustomActivitySubmit);

    // Modal Activity Detail triggers
    document.getElementById("btn-close-detail-modal").addEventListener("click", () => toggleModal("modal-activity-detail", false));
    document.getElementById("btn-cancel-detail-modal").addEventListener("click", () => toggleModal("modal-activity-detail", false));
    document.getElementById("btn-add-activity-confirmed").addEventListener("click", handleScheduledActivityConfirm);

    // Discovery Filters
    document.getElementById("btn-apply-filters").addEventListener("click", applyDiscoveryFilters);
    document.getElementById("filter-cost").addEventListener("input", (e) => {
        document.getElementById("cost-slider-value").innerText = e.target.value + "x";
    });
    document.getElementById("filter-popularity").addEventListener("input", (e) => {
        document.getElementById("popularity-slider-value").innerText = e.target.value + "+";
    });

    // Search inputs
    document.getElementById("city-search-input").addEventListener("input", debounce(applyDiscoveryFilters, 400));
    document.getElementById("trips-search-input").addEventListener("input", debounce(renderMyTrips, 300));
    document.getElementById("trips-sort-select").addEventListener("change", renderMyTrips);

    // Activity Selector search filter inside Itinerary Builder
    document.getElementById("activity-search-box").addEventListener("input", filterStopActivitiesPicker);
    document.getElementById("activity-type-filter").addEventListener("change", filterStopActivitiesPicker);

    // Calendar navigators
    document.getElementById("calendar-prev-month").addEventListener("click", () => adjustCalendarMonth(-1));
    document.getElementById("calendar-next-month").addEventListener("click", () => adjustCalendarMonth(1));
}

// State Views Switches
function showLoginView() {
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("app-container").classList.add("hidden");
}

function showAppView() {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
    renderTabViews();
}

function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Handle titles and states
    let title = "Dashboard";
    if (tabName === "my-trips") title = "My Travel Routes";
    else if (tabName === "discover") title = "Search & Discover Destinations";
    else if (tabName === "admin") {
        title = "Platform Analytics Dashboard";
        loadAdminAnalytics();
    }
    else if (tabName === "profile") title = "Profile & Account Settings";
    else if (tabName === "trip-details") title = state.currentTrip ? `Manage: ${state.currentTrip.title}` : "Trip Details";
    
    document.getElementById("current-view-title").innerText = title;
    
    // Toggle active sidebar highlight
    document.querySelectorAll(".sidebar-menu .menu-item").forEach(item => {
        if (item.dataset.tab === tabName) item.classList.add("active");
        else item.classList.remove("active");
    });
    
    renderTabViews();
}

function renderTabViews() {
    document.querySelectorAll(".tab-view").forEach(view => {
        if (view.id === `view-${state.activeTab}`) view.classList.remove("hidden");
        else view.classList.add("hidden");
    });
}

// Authentication Handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "Incorrect email or password");
        }
        
        const data = await response.json();
        state.token = data.access_token;
        localStorage.setItem("gt_token", state.token);
        
        showToast("Logged in successfully!");
        
        const success = await fetchUserProfile();
        if (success) {
            showAppView();
            fetchSeededCities();
            fetchTrips();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    
    try {
        const regRes = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        
        if (!regRes.ok) {
            const data = await regRes.json();
            throw new Error(data.detail || "Registration failed");
        }
        
        // Log in immediately after sign up
        const logRes = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const logData = await logRes.json();
        state.token = logData.access_token;
        localStorage.setItem("gt_token", state.token);
        
        showToast("Account created successfully!");
        
        const success = await fetchUserProfile();
        if (success) {
            showAppView();
            fetchSeededCities();
            fetchTrips();
        }
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function fetchUserProfile() {
    try {
        const tokenParts = state.token.split(".");
        if (tokenParts.length !== 3) return false;
        
        const payload = JSON.parse(atob(tokenParts[1]));
        state.user = {
            id: payload.id || "",
            email: payload.sub || "",
            name: payload.name || "Active Traveler",
            profile_photo_url: payload.profile_photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            language: payload.language || "en"
        };
        
        // Set values in UI
        document.getElementById("user-display-name").innerText = state.user.name;
        document.getElementById("user-display-email").innerText = state.user.email;
        document.getElementById("profile-name").value = state.user.name;
        document.getElementById("profile-name-title").innerText = state.user.name;
        document.getElementById("profile-email-title").innerText = state.user.email;
        document.getElementById("profile-language").value = state.user.language;
        
        if (state.user.profile_photo_url) {
            document.getElementById("user-avatar-img").src = state.user.profile_photo_url;
            document.getElementById("profile-avatar-big").src = state.user.profile_photo_url;
            state.profileAvatarUrl = state.user.profile_photo_url;
        }

        // Show/hide admin panel based on mock credentials (e.g. admin@globetrotter.com)
        if (state.user.email === "admin@globetrotter.com") {
            document.getElementById("nav-admin").classList.remove("hidden");
        } else {
            document.getElementById("nav-admin").classList.add("hidden");
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById("profile-name").value;
    const language = document.getElementById("profile-language").value;
    
    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify({
                name,
                language,
                profile_photo_url: state.profileAvatarUrl
            })
        });
        
        if (!response.ok) throw new Error("Could not update profile details");
        
        const data = await response.json();
        showToast("Profile settings saved!");
        
        // Update local state
        state.user.name = data.name;
        state.user.profile_photo_url = data.profile_photo_url;
        state.user.language = data.language;
        
        document.getElementById("user-display-name").innerText = data.name;
        document.getElementById("profile-name-title").innerText = data.name;
        document.getElementById("user-avatar-img").src = data.profile_photo_url;
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleDeleteAccount() {
    if (!confirm("Are you absolutely sure you want to permanently delete your GlobeTrotter account? This cannot be undone.")) return;
    
    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not delete account");
        
        showToast("Account deleted successfully.", "success");
        logout();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.trips = [];
    state.currentTrip = null;
    localStorage.removeItem("gt_token");
    showLoginView();
    showToast("Logged out successfully");
}

function toggleAuthPanels(panel) {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("signup-form").classList.add("hidden");
    document.getElementById("forgot-password-modal").classList.add("hidden");
    
    if (panel === "login") document.getElementById("login-form").classList.remove("hidden");
    else if (panel === "signup") document.getElementById("signup-form").classList.remove("hidden");
    else if (panel === "forgot") document.getElementById("forgot-password-modal").classList.remove("hidden");
}

// Trips Fetching and Rendering
async function fetchTrips() {
    try {
        const response = await fetch(`${API_BASE}/trips`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not retrieve trips list");
        
        state.trips = await response.json();
        
        // Sort trips (default date desc)
        state.trips.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        
        renderDashboard();
        renderMyTrips();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderDashboard() {
    const welcome = document.getElementById("welcome-message");
    if (welcome && state.user) {
        welcome.innerText = `Welcome back, ${state.user.name.split(" ")[0]}!`;
    }
    
    // Totals
    document.getElementById("stat-total-trips").innerText = state.trips.length;
    
    let totalBudget = 0;
    let totalStops = 0;
    
    state.trips.forEach(t => {
        totalStops += t.stop_count || 0;
        totalBudget += (t.stop_count || 1) * 350; // simple estimation for overview
    });
    
    document.getElementById("stat-total-budget").innerText = `$${totalBudget.toLocaleString()}`;
    document.getElementById("stat-total-stops").innerText = totalStops;
    
    // Render 3 recent trips
    const recentContainer = document.getElementById("dashboard-recent-trips");
    recentContainer.innerHTML = "";
    
    const recent = state.trips.slice(0, 3);
    
    if (recent.length === 0) {
        recentContainer.innerHTML = `
            <div class="no-data-card glass">
                <p>No trips planned yet. Click "Plan New Trip" to get started!</p>
            </div>
        `;
        return;
    }
    
    recent.forEach(trip => {
        recentContainer.appendChild(createTripCard(trip));
    });
}

function renderMyTrips() {
    const container = document.getElementById("my-trips-list");
    if (!container) return;
    container.innerHTML = "";
    
    const searchQuery = document.getElementById("trips-search-input").value.toLowerCase();
    const sortVal = document.getElementById("trips-sort-select").value;
    
    let filteredTrips = [...state.trips];
    
    if (searchQuery) {
        filteredTrips = filteredTrips.filter(t => 
            t.title.toLowerCase().includes(searchQuery) || 
            (t.description && t.description.toLowerCase().includes(searchQuery))
        );
    }
    
    // Sorting
    if (sortVal === "date-desc") {
        filteredTrips.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    } else if (sortVal === "date-asc") {
        filteredTrips.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    } else if (sortVal === "title") {
        filteredTrips.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    if (filteredTrips.length === 0) {
        container.innerHTML = `
            <div class="no-data-card glass">
                <p>No trips found matching your search. Create one now!</p>
            </div>
        `;
        return;
    }
    
    filteredTrips.forEach(trip => {
        container.appendChild(createTripCard(trip));
    });
}

function createTripCard(trip) {
    const card = document.createElement("div");
    card.className = "trip-card glass";
    
    const imgUrl = trip.cover_photo_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
    const formattedStart = formatDateString(trip.start_date);
    const formattedEnd = formatDateString(trip.end_date);
    
    card.innerHTML = `
        <div class="trip-card-image" style="background-image: url('${imgUrl}')">
            <div class="trip-card-overlay"></div>
            <div class="trip-card-badge"><i class="fa-solid fa-hotel"></i> ${trip.stop_count} Stops</div>
        </div>
        <div class="trip-card-content">
            <h4 class="trip-card-title">${trip.title}</h4>
            <div class="trip-card-dates"><i class="fa-regular fa-calendar"></i> ${formattedStart} – ${formattedEnd}</div>
            <p class="trip-card-desc">${trip.description || "No description provided."}</p>
            <div class="trip-card-footer">
                <button class="btn btn-primary btn-sm btn-open-trip" data-id="${trip.id}">View Itinerary</button>
                <div class="trip-card-actions">
                    <button class="btn-icon-only btn-edit-trip" data-id="${trip.id}" title="Edit Name/Dates"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon-only danger btn-delete-trip" data-id="${trip.id}" title="Delete Trip"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        </div>
    `;
    
    // Attach listener actions
    card.querySelector(".btn-open-trip").addEventListener("click", () => openTripDetails(trip.id));
    card.querySelector(".btn-edit-trip").addEventListener("click", () => openTripModal(trip));
    card.querySelector(".btn-delete-trip").addEventListener("click", () => handleDeleteTrip(trip.id));
    
    return card;
}

// Create/Edit Trip Modal Handlers
function openTripModal(trip = null) {
    const form = document.getElementById("trip-form");
    form.reset();
    
    // Clear chips
    document.querySelectorAll(".suggest-chip").forEach(c => c.classList.remove("active"));
    
    if (trip) {
        document.getElementById("trip-modal-title").innerText = "Update Trip Details";
        document.getElementById("trip-id-field").value = trip.id;
        document.getElementById("trip-title-input").value = trip.title;
        document.getElementById("trip-start-date").value = trip.start_date;
        document.getElementById("trip-end-date").value = trip.end_date;
        document.getElementById("trip-desc-input").value = trip.description || "";
        document.getElementById("trip-cover-input").value = trip.cover_photo_url || "";
    } else {
        document.getElementById("trip-modal-title").innerText = "Plan a New Adventure";
        document.getElementById("trip-id-field").value = "";
        
        // Auto select first suggest chip cover
        const chip = document.querySelector(".suggest-chip");
        chip.classList.add("active");
        document.getElementById("trip-cover-input").value = chip.dataset.url;
    }
    
    toggleModal("modal-trip", true);
}

function closeTripModal() {
    toggleModal("modal-trip", false);
}

async function handleTripSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("trip-id-field").value;
    const title = document.getElementById("trip-title-input").value;
    const start_date = document.getElementById("trip-start-date").value;
    const end_date = document.getElementById("trip-end-date").value;
    const description = document.getElementById("trip-desc-input").value;
    const cover_photo_url = document.getElementById("trip-cover-input").value;
    
    if (new Date(start_date) > new Date(end_date)) {
        showToast("Start date cannot be after end date", "error");
        return;
    }
    
    const body = { title, start_date, end_date, description, cover_photo_url };
    const method = id ? "PUT" : "POST";
    const endpoint = id ? `${API_BASE}/trips/${id}` : `${API_BASE}/trips`;
    
    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error("Error saving trip information");
        
        showToast(id ? "Trip details updated successfully!" : "New trip planned successfully!");
        closeTripModal();
        fetchTrips();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleDeleteTrip(tripId) {
    if (!confirm("Are you sure you want to delete this trip and all its stops, custom activities, and budgets?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/trips/${tripId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not delete the trip");
        
        showToast("Trip deleted", "success");
        
        if (state.currentTrip && state.currentTrip.id === tripId) {
            state.currentTrip = null;
            switchTab("dashboard");
        }
        
        fetchTrips();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// -------------------------------------------------------------
// TRIP DETAILS SUB-WORKSPACES (ITINERARY BUILDER, CALENDAR, BUDGETS)
// -------------------------------------------------------------
async function openTripDetails(tripId) {
    try {
        const response = await fetch(`${API_BASE}/trips/${tripId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not load trip details");
        
        state.currentTrip = await response.json();
        
        // Sort stops chronological order
        state.currentTrip.stops.sort((a, b) => a.order_index - b.order_index);
        
        state.selectedStopId = state.currentTrip.stops.length > 0 ? state.currentTrip.stops[0].id : null;
        
        switchTab("trip-details");
        
        // Reset subviews
        document.querySelectorAll(".trip-sub-nav .sub-nav-btn").forEach(b => b.classList.remove("active"));
        document.querySelector(".trip-sub-nav [data-subview='itinerary']").classList.add("active");
        state.activeSubView = "itinerary";
        
        renderTripSubViews();
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderTripSubViews() {
    // Hide all sub views
    document.querySelectorAll(".trip-sub-view").forEach(v => v.classList.add("hidden"));
    
    // Show active sub view
    const activeSub = document.getElementById(`trip-sub-${state.activeSubView}`);
    if (activeSub) activeSub.classList.remove("hidden");
    
    // Render sub view contents
    if (state.activeSubView === "itinerary") {
        renderItineraryBuilder();
    } else if (state.activeSubView === "calendar") {
        renderCalendarView();
    } else if (state.activeSubView === "budget") {
        renderBudgetBreakdown();
    }
}

// 1. Itinerary Builder View Renderers
function renderItineraryBuilder() {
    // Title card
    const headerCard = document.getElementById("trip-header-card");
    const imgUrl = state.currentTrip.cover_photo_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
    
    headerCard.innerHTML = `
        <div class="trip-details-banner" style="background-image: url('${imgUrl}')"></div>
        <div class="trip-meta-left">
            <h2>${state.currentTrip.title}</h2>
            <div class="trip-meta-info">
                <span><i class="fa-regular fa-calendar"></i> ${formatDateString(state.currentTrip.start_date)} – ${formatDateString(state.currentTrip.end_date)}</span>
                <span><i class="fa-solid fa-map-location-dot"></i> ${state.currentTrip.stops.length} Stop(s)</span>
            </div>
            <p class="mt-2 text-secondary text-small">${state.currentTrip.description || ""}</p>
        </div>
        <div class="trip-actions">
            <button class="btn btn-secondary btn-sm" id="btn-share-trip"><i class="fa-solid fa-share-nodes"></i> Share Trip</button>
            <button class="btn btn-glass-circle btn-sm" id="btn-refresh-trip-details"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
    `;
    
    document.getElementById("btn-share-trip").addEventListener("click", handleShareTripLink);
    document.getElementById("btn-refresh-trip-details").addEventListener("click", () => openTripDetails(state.currentTrip.id));
    
    // Stops list timeline
    const timelineContainer = document.getElementById("trip-stops-timeline");
    timelineContainer.innerHTML = "";
    
    if (state.currentTrip.stops.length === 0) {
        timelineContainer.innerHTML = `
            <div class="no-data-card glass">
                <i class="fa-solid fa-map-location-dot text-muted" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <p>Your itinerary is empty. Click "Add Destination Stop" to include a city in your trip!</p>
            </div>
        `;
        
        // Hide activities picker
        document.getElementById("activities-selection-list").innerHTML = `
            <div class="no-selection-indicator">
                <i class="fa-regular fa-map-location-dot"></i>
                <p>Click on any Stop Card to browse and schedule activities.</p>
            </div>
        `;
        return;
    }
    
    state.currentTrip.stops.forEach((stop, index) => {
        const isActive = stop.id === state.selectedStopId;
        const stopCard = document.createElement("div");
        stopCard.className = `timeline-stop-card glass ${isActive ? 'active' : ''}`;
        stopCard.dataset.id = stop.id;
        
        let activitiesHTML = "";
        
        // Sort itinerary items by order index
        const sortedItems = [...stop.itinerary_items].sort((a,b) => a.order_index - b.order_index);
        
        if (sortedItems.length === 0) {
            activitiesHTML = `<div class="empty-stop-itinerary">No activities scheduled. Select this card and add activities from side panel.</div>`;
        } else {
            sortedItems.forEach(item => {
                const name = item.activity ? item.activity.name : item.custom_name;
                const cost = item.custom_cost !== null ? item.custom_cost : (item.activity ? item.activity.default_cost : 0);
                const timeStr = item.scheduled_time ? formatTime(item.scheduled_time) : "Anytime";
                
                activitiesHTML += `
                    <div class="itinerary-item-row">
                        <div class="item-left">
                            <span class="item-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                            <span class="item-name">${name}</span>
                        </div>
                        <div class="item-right">
                            <span class="item-cost">$${cost.toFixed(2)}</span>
                            <button class="btn-icon-only danger btn-remove-item" data-itemid="${item.id}" title="Remove Activity"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `;
            });
        }
        
        stopCard.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="stop-card-header">
                <div class="stop-card-info">
                    <h4>Stop ${index + 1}: ${stop.city.name}, ${stop.city.country}</h4>
                    <span>${formatDateString(stop.arrival_date)} – ${formatDateString(stop.departure_date)}</span>
                </div>
                <div class="stop-card-controls">
                    <button class="btn-icon-only btn-add-custom-item" data-stopid="${stop.id}" title="Add Custom Event (Flight, Hotel, Dinner...)"><i class="fa-solid fa-circle-plus text-accent"></i></button>
                    <button class="btn-icon-only btn-move-stop-up" data-stopid="${stop.id}" data-index="${index}" title="Move Up"><i class="fa-solid fa-chevron-up"></i></button>
                    <button class="btn-icon-only btn-move-stop-down" data-stopid="${stop.id}" data-index="${index}" title="Move Down"><i class="fa-solid fa-chevron-down"></i></button>
                    <button class="btn-icon-only danger btn-remove-stop" data-stopid="${stop.id}" title="Delete Stop"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="stop-itinerary-items">
                ${activitiesHTML}
            </div>
        `;
        
        // Clicks card to select stop and display activities
        stopCard.addEventListener("click", (e) => {
            // Avoid selecting if buttons are clicked
            if (e.target.closest("button") || e.target.closest("i")) return;
            selectStop(stop.id, stop.city.id);
        });
        
        // Add events
        stopCard.querySelector(".btn-add-custom-item").addEventListener("click", () => openCustomActivityModal(stop.id));
        stopCard.querySelector(".btn-move-stop-up").addEventListener("click", () => handleMoveStop(index, -1));
        stopCard.querySelector(".btn-move-stop-down").addEventListener("click", () => handleMoveStop(index, 1));
        stopCard.querySelector(".btn-remove-stop").addEventListener("click", () => handleRemoveStop(stop.id));
        
        stopCard.querySelectorAll(".btn-remove-item").forEach(btn => {
            btn.addEventListener("click", (e) => {
                handleRemoveItineraryItem(e.currentTarget.dataset.itemid);
            });
        });
        
        timelineContainer.appendChild(stopCard);
    });
    
    // Add Stop trigger inside timeline header
    document.getElementById("btn-add-stop").onclick = () => openAddStopModal();
    
    // Render side panel activities for selected stop
    const activeStopObj = state.currentTrip.stops.find(s => s.id === state.selectedStopId);
    if (activeStopObj) {
        selectStop(activeStopObj.id, activeStopObj.city.id);
    } else if (state.currentTrip.stops.length > 0) {
        // Fallback
        const first = state.currentTrip.stops[0];
        selectStop(first.id, first.city.id);
    }
}

async function selectStop(stopId, cityId) {
    state.selectedStopId = stopId;
    
    // Highlight stop card
    document.querySelectorAll(".timeline-stop-card").forEach(card => {
        if (card.dataset.id === stopId) card.classList.add("active");
        else card.classList.remove("active");
    });
    
    const stopObj = state.currentTrip.stops.find(s => s.id === stopId);
    document.getElementById("activity-panel-sub-label").innerText = `Available inside ${stopObj.city.name}`;
    
    // Fetch activities for city
    try {
        const res = await fetch(`${API_BASE}/search/activities?city_id=${cityId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!res.ok) throw new Error("Could not fetch activities");
        
        const activitiesList = await res.json();
        renderStopActivitiesPicker(activitiesList);
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderStopActivitiesPicker(activities) {
    const list = document.getElementById("activities-selection-list");
    list.innerHTML = "";
    
    if (activities.length === 0) {
        list.innerHTML = `
            <div class="no-selection-indicator">
                <i class="fa-regular fa-face-frown"></i>
                <p>No default activities found for this city. You can add custom activities using the stop controls.</p>
            </div>
        `;
        return;
    }
    
    activities.forEach(act => {
        const card = document.createElement("div");
        card.className = "activity-picker-card";
        card.innerHTML = `
            <div class="activity-picker-title">${act.name}</div>
            <div class="activity-picker-desc">${act.description || ""}</div>
            <div class="activity-picker-footer">
                <span class="activity-type-badge">${act.type} • ${act.duration_minutes}m</span>
                <span class="activity-picker-cost">$${act.default_cost.toFixed(2)}</span>
            </div>
        `;
        
        card.addEventListener("click", () => openActivityDetailModal(act));
        list.appendChild(card);
    });
    
    // Save locally for quick filtering
    state.stopActivities = activities;
}

function filterStopActivitiesPicker() {
    const query = document.getElementById("activity-search-box").value.toLowerCase();
    const type = document.getElementById("activity-type-filter").value;
    
    if (!state.stopActivities) return;
    
    let filtered = state.stopActivities;
    
    if (query) {
        filtered = filtered.filter(act => 
            act.name.toLowerCase().includes(query) || 
            (act.description && act.description.toLowerCase().includes(query))
        );
    }
    
    if (type) {
        filtered = filtered.filter(act => act.type.toLowerCase() === type.toLowerCase());
    }
    
    renderStopActivitiesPicker(filtered);
}

// Custom and Scheduled Activities Modals
function openCustomActivityModal(stopId) {
    document.getElementById("custom-activity-form").reset();
    document.getElementById("custom-stop-id").value = stopId;
    
    // Pre-populate time field with stop arrival date
    const stopObj = state.currentTrip.stops.find(s => s.id === stopId);
    const dateStr = stopObj.arrival_date;
    document.getElementById("custom-time-input").value = `${dateStr}T10:00`;
    
    toggleModal("modal-custom-activity", true);
}

async function handleCustomActivitySubmit(e) {
    e.preventDefault();
    const stopId = document.getElementById("custom-stop-id").value;
    const custom_name = document.getElementById("custom-name-input").value;
    const scheduled_time = document.getElementById("custom-time-input").value;
    const custom_cost = parseFloat(document.getElementById("custom-cost-input").value) || 0.0;
    
    const body = {
        stop_id: stopId,
        custom_name,
        scheduled_time: new Date(scheduled_time).toISOString(),
        custom_cost
    };
    
    try {
        const response = await fetch(`${API_BASE}/itinerary/stops/${stopId}/activities`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error("Could not add custom activity");
        
        showToast("Activity added successfully!");
        toggleModal("modal-custom-activity", false);
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

function openActivityDetailModal(activity) {
    document.getElementById("activity-detail-title").innerText = activity.name;
    document.getElementById("activity-detail-type").innerText = activity.type;
    document.getElementById("activity-detail-duration").innerText = `${activity.duration_minutes} mins`;
    document.getElementById("activity-detail-cost").innerText = `$${activity.default_cost.toFixed(2)}`;
    document.getElementById("activity-detail-description").innerText = activity.description || "No description available.";
    
    document.getElementById("activity-custom-cost").value = "";
    
    // Pre-populate date picker inside stop limits
    const stopObj = state.currentTrip.stops.find(s => s.id === state.selectedStopId);
    document.getElementById("activity-schedule-time").value = `${stopObj.arrival_date}T09:00`;
    
    state.pendingActivity = activity;
    toggleModal("modal-activity-detail", true);
}

async function handleScheduledActivityConfirm() {
    const time = document.getElementById("activity-schedule-time").value;
    const customCostInput = document.getElementById("activity-custom-cost").value;
    const custom_cost = customCostInput ? parseFloat(customCostInput) : null;
    
    if (!time) {
        showToast("Please choose scheduled date and time", "error");
        return;
    }
    
    const body = {
        stop_id: state.selectedStopId,
        activity_id: state.pendingActivity.id,
        scheduled_time: new Date(time).toISOString(),
        custom_cost
    };
    
    try {
        const response = await fetch(`${API_BASE}/itinerary/stops/${state.selectedStopId}/activities`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error("Could not add activity to itinerary stop");
        
        showToast("Activity scheduled!");
        toggleModal("modal-activity-detail", false);
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleRemoveItineraryItem(itemId) {
    if (!confirm("Remove this activity from your itinerary?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/itinerary/${itemId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not remove activity");
        
        showToast("Activity removed!");
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

// Stops timeline handlers
function openAddStopModal() {
    const select = document.getElementById("stop-city-select");
    select.innerHTML = "";
    
    state.cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city.id;
        option.innerText = `${city.name}, ${city.country} (Cost index: ${city.cost_index}x)`;
        select.appendChild(option);
    });
    
    // Prefill dates inside trip bounds
    document.getElementById("stop-arrival-date").value = state.currentTrip.start_date;
    document.getElementById("stop-departure-date").value = state.currentTrip.end_date;
    
    toggleModal("modal-stop", true);
}

async function handleStopSubmit(e) {
    e.preventDefault();
    const city_id = document.getElementById("stop-city-select").value;
    const arrival_date = document.getElementById("stop-arrival-date").value;
    const departure_date = document.getElementById("stop-departure-date").value;
    
    if (new Date(arrival_date) > new Date(departure_date)) {
        showToast("Arrival date cannot be after departure date", "error");
        return;
    }
    
    const body = { city_id, arrival_date, departure_date };
    
    try {
        const response = await fetch(`${API_BASE}/trips/${state.currentTrip.id}/stops`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error("Could not add stop to your trip");
        
        showToast("Stop added to trip!");
        toggleModal("modal-stop", false);
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleRemoveStop(stopId) {
    if (!confirm("Are you sure you want to remove this stop destination? This deletes all scheduled activities inside this stop.")) return;
    
    try {
        const response = await fetch(`${API_BASE}/trips/stops/${stopId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not delete stop");
        
        showToast("Stop destination removed!");
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleMoveStop(index, direction) {
    const stops = [...state.currentTrip.stops];
    const targetIdx = index + direction;
    
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    
    // Swap order indexes
    const currentStop = stops[index];
    const swapStop = stops[targetIdx];
    
    const order_list = [
        { item_id: currentStop.id, order_index: targetIdx },
        { item_id: swapStop.id, order_index: index }
    ];
    
    try {
        const response = await fetch(`${API_BASE}/trips/${state.currentTrip.id}/stops/reorder`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.token}`
            },
            body: JSON.stringify({ order_list })
        });
        
        if (!response.ok) throw new Error("Could not swap stop ordering");
        
        showToast("Stops sequence updated");
        openTripDetails(state.currentTrip.id);
    } catch (err) {
        showToast(err.message, "error");
    }
}

// 2. Trip Calendar Subview Renderer
function renderCalendarView() {
    // Generate dates based on calendarDate state
    const grid = document.getElementById("calendar-days-grid");
    grid.innerHTML = "";
    
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    
    // Set Calendar Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calendar-month-year").innerText = `${monthNames[month]} ${year}`;
    
    // Days logic
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Load days in calendar view
    // 1. Previous month padded days
    for (let i = firstDayIndex; i > 0; i--) {
        const cell = document.createElement("div");
        cell.className = "calendar-day-cell other-month";
        cell.innerHTML = `<span class="calendar-day-num"></span>`;
        grid.appendChild(cell);
    }
    
    // 2. Active month days
    const tripStart = new Date(state.currentTrip.start_date);
    const tripEnd = new Date(state.currentTrip.end_date);
    
    // Collect all activities mapped by date
    const dailyActivities = {};
    state.currentTrip.stops.forEach(stop => {
        stop.itinerary_items.forEach(item => {
            if (item.scheduled_time) {
                const dateStr = item.scheduled_time.split("T")[0];
                if (!dailyActivities[dateStr]) dailyActivities[dateStr] = [];
                dailyActivities[dateStr].push(item);
            }
        });
    });
    
    for (let day = 1; day <= lastDay; day++) {
        const cellDate = new Date(year, month, day);
        const cellDateStr = cellDate.toISOString().split("T")[0];
        
        const isWithinTrip = cellDate >= tripStart && cellDate <= tripEnd;
        const stopEntry = state.currentTrip.stops.find(s => s.arrival_date === cellDateStr);
        
        const cell = document.createElement("div");
        cell.className = `calendar-day-cell ${isWithinTrip ? 'in-trip' : ''} ${stopEntry ? 'active-stop-start' : ''}`;
        
        let dotsHTML = "";
        const dayActs = dailyActivities[cellDateStr] || [];
        
        if (dayActs.length > 0) {
            dotsHTML = `<div class="calendar-cell-dots">`;
            dayActs.forEach(act => {
                const typeClass = act.activity ? act.activity.type.toLowerCase() : "custom";
                dotsHTML += `<span class="calendar-dot ${typeClass}" title="${act.activity ? act.activity.name : act.custom_name}"></span>`;
            });
            dotsHTML += `</div>`;
        }
        
        cell.innerHTML = `
            <span class="calendar-day-num">${day}</span>
            ${stopEntry ? `<span class="text-small text-accent font-bold" style="font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Arr: ${stopEntry.city.name}</span>` : ""}
            ${dotsHTML}
        `;
        
        cell.addEventListener("click", () => {
            // Highlight select cell
            document.querySelectorAll(".calendar-day-cell").forEach(c => c.classList.remove("selected"));
            cell.classList.add("selected");
            showCalendarDayDetails(cellDateStr, cellDate, dayActs);
        });
        
        grid.appendChild(cell);
    }
}

function showCalendarDayDetails(dateStr, dateObj, activities) {
    const container = document.getElementById("calendar-selected-day-details");
    container.innerHTML = "";
    
    const formatted = dateObj.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let listHTML = "";
    if (activities.length === 0) {
        listHTML = `<p class="text-muted mt-2">No activities scheduled for this date.</p>`;
    } else {
        activities.sort((a,b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
        activities.forEach(item => {
            const name = item.activity ? item.activity.name : item.custom_name;
            const time = formatTime(item.scheduled_time);
            const cost = item.custom_cost !== null ? item.custom_cost : (item.activity ? item.activity.default_cost : 0);
            
            listHTML += `
                <div class="itinerary-item-row mt-2" style="background: rgba(255,255,255,0.03)">
                    <div class="item-left">
                        <span class="item-time">${time}</span>
                        <span class="item-name">${name}</span>
                    </div>
                    <div class="item-right">
                        <span class="item-cost">$${cost.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = `
        <h4>Activities for ${formatted}</h4>
        ${listHTML}
    `;
}

function adjustCalendarMonth(direction) {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + direction);
    renderCalendarView();
}

// 3. Budgets & SVG Cost Breakdown Chart Renderer
async function renderBudgetBreakdown() {
    try {
        // Fetch budget calculation
        const bRes = await fetch(`${API_BASE}/budget/trips/${state.currentTrip.id}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        const budget = await bRes.json();
        
        // Fetch daily logs
        const dRes = await fetch(`${API_BASE}/budget/trips/${state.currentTrip.id}/daily`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        const daily = await dRes.json();
        
        // Update stats
        document.getElementById("budget-total-spend").innerText = `$${budget.total_budget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const days = daily.daily_costs.length || 1;
        const avg = budget.total_budget / days;
        document.getElementById("budget-avg-daily").innerText = `$${avg.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Render Category Pie Chart (SVG)
        renderBudgetPieChart(budget.breakdown);
        
        // Render Cost Bar Chart (SVG styling)
        renderBudgetBarChart(daily.daily_costs);
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderBudgetPieChart(breakdown) {
    const container = document.getElementById("budget-pie-chart-container");
    container.innerHTML = "";
    
    const legend = document.getElementById("budget-pie-legend");
    legend.innerHTML = "";
    
    const total = breakdown.stay + breakdown.meals + breakdown.activities + breakdown.transport;
    
    if (total === 0) {
        container.innerHTML = `<p class="text-muted">No costs calculated yet. Add stops or activities to generate chart.</p>`;
        return;
    }
    
    const categories = [
        { name: "Accommodation", value: breakdown.stay, color: "stay" },
        { name: "Dining/Meals", value: breakdown.meals, color: "meals" },
        { name: "Activities", value: breakdown.activities, color: "activities" },
        { name: "Local Transport", value: breakdown.transport, color: "transport" }
    ];
    
    // Draw SVG Pie
    let svgContent = `<svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg)">`;
    let accumulatedPercent = 0;
    
    categories.forEach(cat => {
        const pct = cat.value / total;
        if (pct === 0) return;
        
        // Render legend item
        const legItem = document.createElement("div");
        legItem.className = "legend-item";
        legItem.innerHTML = `
            <span class="legend-color-dot ${cat.color}"></span>
            <span>${cat.name}: $${cat.value.toFixed(0)} (${(pct*100).toFixed(0)}%)</span>
        `;
        legend.appendChild(legItem);
        
        // Calc SVG Path coordinates
        const startX = 100 + 80 * Math.cos(2 * Math.PI * accumulatedPercent);
        const startY = 100 + 80 * Math.sin(2 * Math.PI * accumulatedPercent);
        
        accumulatedPercent += pct;
        
        const endX = 100 + 80 * Math.cos(2 * Math.PI * accumulatedPercent);
        const endY = 100 + 80 * Math.sin(2 * Math.PI * accumulatedPercent);
        
        const largeArc = pct > 0.5 ? 1 : 0;
        
        const fillColors = {
            stay: "hsl(210, 100%, 60%)",
            meals: "hsl(35, 100%, 55%)",
            activities: "hsl(343, 90%, 55%)",
            transport: "hsl(150, 80%, 45%)"
        };
        
        svgContent += `
            <path d="M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY} Z" 
                  fill="${fillColors[cat.color]}" 
                  stroke="var(--bg-secondary)" 
                  stroke-width="2">
                  <title>${cat.name}: $${cat.value.toFixed(2)}</title>
            </path>
        `;
    });
    
    // Center circle for donut look
    svgContent += `<circle cx="100" cy="100" r="45" fill="var(--bg-secondary)" />`;
    svgContent += `</svg>`;
    
    container.innerHTML = svgContent;
}

function renderBudgetBarChart(dailyCosts) {
    const container = document.getElementById("budget-bar-chart-container");
    container.innerHTML = "";
    
    if (dailyCosts.length === 0) {
        container.innerHTML = `<p class="text-muted" style="align-self: center; margin: auto;">Schedule stops to populate daily spending bar charts.</p>`;
        return;
    }
    
    const maxVal = Math.max(...dailyCosts.map(d => d.total_cost), 400.0); // baseline scale limit
    
    dailyCosts.forEach(item => {
        const pctHeight = (item.total_cost / maxVal) * 100;
        const column = document.createElement("div");
        column.className = "bar-chart-column";
        
        const formattedDate = formatDateString(item.date).split(",")[0];
        
        column.innerHTML = `
            <span class="bar-label-top">$${item.total_cost.toFixed(0)}</span>
            <div class="bar-chart-fill ${item.is_overbudget ? 'overbudget' : ''}" style="height: ${pctHeight}%"></div>
            <span class="bar-label-bottom">${formattedDate}</span>
        `;
        
        container.appendChild(column);
    });
}

// -------------------------------------------------------------
// PUBLIC SHARING VIEWS AND HANDLERS
// -------------------------------------------------------------
async function handleShareTripLink() {
    try {
        const response = await fetch(`${API_BASE}/shared/trips/${state.currentTrip.id}/share`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not enable public sharing for this trip");
        
        const trip = await response.json();
        
        // Build public URL structure
        const publicUrl = `${window.location.origin}${window.location.pathname}?share=${trip.share_token}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(publicUrl);
        
        showToast("Public share link copied to clipboard!");
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function loadPublicTrip(shareToken) {
    const header = document.getElementById("public-trip-header");
    const timeline = document.getElementById("public-stops-timeline");
    const budgetPanel = document.getElementById("public-budget-panel");
    
    header.innerHTML = `<h3>Loading Shared Itinerary...</h3>`;
    timeline.innerHTML = "";
    budgetPanel.innerHTML = "";
    
    try {
        const response = await fetch(`${API_BASE}/shared/${shareToken}`, {
            method: "GET"
        });
        
        if (!response.ok) throw new Error("Public itinerary not found or has been revoked");
        
        const trip = await response.json();
        trip.stops.sort((a,b) => a.order_index - b.order_index);
        
        const imgUrl = trip.cover_photo_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
        
        // Render public header
        header.innerHTML = `
            <div class="trip-details-banner" style="background-image: url('${imgUrl}')"></div>
            <div class="trip-meta-left">
                <span class="badge badge-accent mb-2">Shared Route</span>
                <h2>${trip.title}</h2>
                <div class="trip-meta-info">
                    <span><i class="fa-regular fa-calendar"></i> ${formatDateString(trip.start_date)} – ${formatDateString(trip.end_date)}</span>
                    <span><i class="fa-solid fa-hotel"></i> ${trip.stops.length} Destination Stops</span>
                </div>
                <p class="mt-2 text-secondary">${trip.description || ""}</p>
            </div>
            <div class="trip-actions">
                <button class="btn btn-accent btn-sm" id="btn-copy-public-trip"><i class="fa-solid fa-copy"></i> Save/Copy to My Account</button>
            </div>
        `;
        
        document.getElementById("btn-copy-public-trip").addEventListener("click", () => handleCopyPublicTrip(shareToken));
        
        // Render read-only day-by-day itinerary
        if (trip.stops.length === 0) {
            timeline.innerHTML = `<div class="no-data-card glass"><p>No stop destinations in this shared itinerary.</p></div>`;
        } else {
            trip.stops.forEach((stop, index) => {
                const stopCard = document.createElement("div");
                stopCard.className = "timeline-stop-card glass active";
                stopCard.style.paddingLeft = "24px";
                
                let actsHTML = "";
                const sortedItems = [...stop.itinerary_items].sort((a,b) => a.order_index - b.order_index);
                
                if (sortedItems.length === 0) {
                    actsHTML = `<div class="empty-stop-itinerary">No activities scheduled for this stop.</div>`;
                } else {
                    sortedItems.forEach(item => {
                        const name = item.activity ? item.activity.name : item.custom_name;
                        const time = item.scheduled_time ? formatTime(item.scheduled_time) : "Anytime";
                        const cost = item.custom_cost !== null ? item.custom_cost : (item.activity ? item.activity.default_cost : 0);
                        
                        actsHTML += `
                            <div class="itinerary-item-row" style="background: rgba(255,255,255,0.03)">
                                <div class="item-left">
                                    <span class="item-time"><i class="fa-regular fa-clock"></i> ${time}</span>
                                    <span class="item-name">${name}</span>
                                </div>
                                <div class="item-right">
                                    <span class="item-cost">$${cost.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                    });
                }
                
                stopCard.innerHTML = `
                    <div class="timeline-marker" style="background: var(--color-accent)"></div>
                    <div class="stop-card-header" style="border: none; margin-bottom: 0;">
                        <div class="stop-card-info">
                            <h4>Stop ${index + 1}: ${stop.city.name}, ${stop.city.country}</h4>
                            <span>${formatDateString(stop.arrival_date)} – ${formatDateString(stop.departure_date)}</span>
                        </div>
                    </div>
                    <div class="stop-itinerary-items mt-3">
                        ${actsHTML}
                    </div>
                `;
                timeline.appendChild(stopCard);
            });
        }
        
        // Simple public budget summary calculation
        let publicTotal = 0;
        trip.stops.forEach(s => {
            const days = (new Date(s.departure_date) - new Date(s.arrival_date)) / (1000 * 60 * 60 * 24) || 1;
            const index = s.city.cost_index || 1.0;
            // Calculations mirroring budget.py
            publicTotal += (100 + 50 + 30) * days * index;
            s.itinerary_items.forEach(item => {
                publicTotal += item.custom_cost !== null ? item.custom_cost : (item.activity ? item.activity.default_cost : 0);
            });
        });
        
        budgetPanel.innerHTML = `
            <h4>Financial Breakdown</h4>
            <div class="budget-stat-card glass mt-3" style="background: none; border-color: rgba(255,255,255,0.05)">
                <span class="lbl" style="font-size: 0.8rem">Estimated Public Cost</span>
                <span class="val text-accent" style="font-size: 1.5rem">$${publicTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <p class="text-small text-muted mt-3">Calculated using average hotel stay and local meals estimations scaled to city indexes plus tours fees.</p>
        `;
        
    } catch (err) {
        header.innerHTML = `
            <div class="no-data-card glass">
                <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 2.2rem; margin-bottom: 12px;"></i>
                <h3>Itinerary Revoked or Invalid</h3>
                <p class="mt-2">${err.message}</p>
                <button class="btn btn-primary mt-3" onclick="window.location.search = ''">Go to App Homepage</button>
            </div>
        `;
    }
}

async function handleCopyPublicTrip(shareToken) {
    if (!state.token) {
        showToast("Please log in or register first to save this trip to your account!", "error");
        // Redirect/Save context
        toggleAuthPanels("login");
        document.getElementById("auth-container").classList.remove("hidden");
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/shared/${shareToken}/copy`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        
        if (!response.ok) throw new Error("Could not copy itinerary");
        
        const copied = await response.json();
        showToast("Trip copied successfully to your account!", "success");
        
        // Remove share query, open trip details
        window.history.pushState({}, document.title, window.location.pathname);
        state.token = localStorage.getItem("gt_token");
        
        await fetchUserProfile();
        showAppView();
        await fetchTrips();
        openTripDetails(copied.id);
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

// -------------------------------------------------------------
// SEEDED DATA AND CITY SEARCH & DISCOVERY INTERFACES
// -------------------------------------------------------------
async function fetchSeededCities() {
    try {
        const response = await fetch(`${API_BASE}/search/cities`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        if (!response.ok) throw new Error("Could not load cities database");
        state.cities = await response.json();
        
        renderDiscoveryCitiesList(state.cities);
    } catch (err) {
        showToast(err.message, "error");
    }
}

function renderDiscoveryCitiesList(citiesList) {
    const grid = document.getElementById("cities-search-results");
    grid.innerHTML = "";
    
    // Renders static decorative photos mapping seeded entries for premium aesthetic
    const photosMap = {
        "Tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80",
        "Paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
        "New York": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80",
        "London": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80",
        "Rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80",
        "Sydney": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=400&q=80",
        "Cape Town": "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&q=80",
        "Cairo": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=400&q=80",
        "Bangkok": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=400&q=80",
        "Rio de Janeiro": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80"
    };

    // Render Hero Cards on Dashboard recommended too if needed
    const dashboardRec = document.getElementById("dashboard-recommendations");
    if (dashboardRec && dashboardRec.children.length === 0) {
        citiesList.slice(0, 4).forEach(city => {
            const card = document.createElement("div");
            card.className = "recommend-card";
            card.innerHTML = `
                <img src="${photosMap[city.name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80'}" class="recommend-img" alt="${city.name}">
                <div class="recommend-badge">${city.region}</div>
                <div class="recommend-overlay">
                    <span class="recommend-name">${city.name}</span>
                    <div class="recommend-meta">
                        <span>Cost index: ${city.cost_index}x</span>
                        <span>★ ${city.popularity_score}</span>
                    </div>
                </div>
            `;
            card.onclick = () => {
                switchTab("discover");
                document.getElementById("city-search-input").value = city.name;
                applyDiscoveryFilters();
            };
            dashboardRec.appendChild(card);
        });
    }

    if (citiesList.length === 0) {
        grid.innerHTML = `<div class="no-data-card glass"><p>No cities found matching your filter rules.</p></div>`;
        return;
    }
    
    citiesList.forEach(city => {
        const card = document.createElement("div");
        card.className = "city-search-card glass";
        
        let costSymbols = "";
        const idx = city.cost_index;
        if (idx <= 0.6) costSymbols = "$";
        else if (idx <= 1.0) costSymbols = "$$";
        else if (idx <= 1.3) costSymbols = "$$$";
        else costSymbols = "$$$$";
        
        card.innerHTML = `
            <div class="city-card-header">
                <div class="city-card-title">
                    <h4>${city.name}</h4>
                    <span>${city.country} • ${city.region}</span>
                </div>
                <span class="cost-rating" title="Cost Index: ${city.cost_index}x">${costSymbols}</span>
            </div>
            <div class="city-card-details">
                Popularity Rating: ★ ${city.popularity_score.toFixed(1)} / 10.0
            </div>
            <div class="city-card-actions">
                <span class="popularity-chip"><i class="fa-solid fa-location-arrow"></i> Explore</span>
                <button class="btn btn-primary btn-sm btn-quick-add-trip" data-cityid="${city.id}"><i class="fa-solid fa-circle-plus"></i> Add to Trip</button>
            </div>
        `;
        
        card.querySelector(".btn-quick-add-trip").addEventListener("click", () => {
            if (state.trips.length === 0) {
                showToast("Please plan a trip container first before adding stops!", "error");
                openTripModal();
                return;
            }
            // Add directly to current or most recent trip stop
            if (state.currentTrip) {
                // Pre-populate add stop modal and open
                openAddStopModal();
                document.getElementById("stop-city-select").value = city.id;
            } else {
                openTripDetails(state.trips[0].id).then(() => {
                    openAddStopModal();
                    document.getElementById("stop-city-select").value = city.id;
                });
            }
        });
        
        grid.appendChild(card);
    });
}

function applyDiscoveryFilters() {
    const query = document.getElementById("city-search-input").value.toLowerCase();
    const region = document.getElementById("filter-region").value;
    const maxCost = parseFloat(document.getElementById("filter-cost").value);
    const minPopularity = parseFloat(document.getElementById("filter-popularity").value);
    
    let filtered = state.cities;
    
    if (query) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.country.toLowerCase().includes(query)
        );
    }
    
    if (region) {
        filtered = filtered.filter(c => c.region === region);
    }
    
    filtered = filtered.filter(c => c.cost_index <= maxCost);
    filtered = filtered.filter(c => c.popularity_score >= minPopularity);
    
    renderDiscoveryCitiesList(filtered);
}

// -------------------------------------------------------------
// ADMIN ANALYTICS PANEL & REPORT RENDERERS
// -------------------------------------------------------------
async function loadAdminAnalytics() {
    const statsContainer = document.getElementById("admin-stats-cards");
    const popularContainer = document.getElementById("admin-trending-destinations");
    const chartContainer = document.getElementById("admin-analytics-chart-container");
    
    statsContainer.innerHTML = "<h4>Loading platform insights...</h4>";
    popularContainer.innerHTML = "";
    chartContainer.innerHTML = "";
    
    try {
        const statsRes = await fetch(`${API_BASE}/admin/analytics`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        const stats = await statsRes.json();
        
        const popularRes = await fetch(`${API_BASE}/admin/destinations/popular`, {
            headers: { "Authorization": `Bearer ${state.token}` }
        });
        const popular = await popularRes.json();
        
        // Renders statistics cards
        statsContainer.innerHTML = `
            <div class="stat-card glass">
                <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
                <div class="stat-details">
                    <span class="stat-value">${stats.total_users}</span>
                    <span class="stat-label">Registered Accounts</span>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-icon"><i class="fa-solid fa-map"></i></div>
                <div class="stat-details">
                    <span class="stat-value">${stats.total_trips}</span>
                    <span class="stat-label">Total Routes Built</span>
                </div>
            </div>
            <div class="stat-card glass">
                <div class="stat-icon"><i class="fa-solid fa-heart-pulse"></i></div>
                <div class="stat-details">
                    <span class="stat-value">${stats.total_activities_scheduled}</span>
                    <span class="stat-label">Activities Booked</span>
                </div>
            </div>
        `;
        
        // Renders trending visited locations
        if (popular.length === 0) {
            popularContainer.innerHTML = `<p class="text-muted">No trip data logged yet to display trends.</p>`;
        } else {
            popular.forEach((city, index) => {
                const item = document.createElement("div");
                item.className = "admin-list-item";
                item.innerHTML = `
                    <div class="admin-list-left">
                        <span class="admin-list-index">${index + 1}</span>
                        <span><strong>${city.name}</strong>, ${city.country}</span>
                    </div>
                    <span class="badge" style="background: rgba(99,179,237,0.1); border: 1px solid rgba(99,179,237,0.2);">${city.visit_count} visits</span>
                `;
                popularContainer.appendChild(item);
            });
        }
        
        // Draw analytical bar chart (SVG format)
        renderAdminAnalyticsChart(stats);
        
    } catch (err) {
        statsContainer.innerHTML = `<div class="no-data-card glass"><p>Access Denied or Error loading admin: ${err.message}</p></div>`;
    }
}

function renderAdminAnalyticsChart(stats) {
    const container = document.getElementById("admin-analytics-chart-container");
    
    // Compare total stops vs activities scheduled
    const stopsCount = stats.total_stops;
    const activitiesCount = stats.total_activities_scheduled;
    const tripsCount = stats.total_trips;
    
    const maxVal = Math.max(stopsCount, activitiesCount, tripsCount, 5);
    
    const pctStops = (stopsCount / maxVal) * 100;
    const pctActs = (activitiesCount / maxVal) * 100;
    const pctTrips = (tripsCount / maxVal) * 100;
    
    container.innerHTML = `
        <div class="bar-chart-container" style="width: 100%; height: 200px;">
            <div class="bar-chart-column">
                <span class="bar-label-top">${tripsCount}</span>
                <div class="bar-chart-fill" style="height: ${pctTrips}%; background: hsl(210, 100%, 60%);"></div>
                <span class="bar-label-bottom">Trips</span>
            </div>
            <div class="bar-chart-column">
                <span class="bar-label-top">${stopsCount}</span>
                <div class="bar-chart-fill" style="height: ${pctStops}%; background: hsl(150, 80%, 45%);"></div>
                <span class="bar-label-bottom">Stops</span>
            </div>
            <div class="bar-chart-column">
                <span class="bar-label-top">${activitiesCount}</span>
                <div class="bar-chart-fill" style="height: ${pctActs}%; background: hsl(343, 90%, 55%);"></div>
                <span class="bar-label-bottom">Events</span>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// HELPER CONVERSIONS AND WRAPPERS
// -------------------------------------------------------------
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) modal.classList.remove("hidden");
    else modal.classList.add("hidden");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    toast.classList.remove("hidden");
    
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
}

function formatDateString(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Debounce helper for inputs search
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

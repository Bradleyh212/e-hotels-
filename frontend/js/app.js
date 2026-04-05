const API_BASE = 'http://localhost:3000';

const authSection = document.getElementById('authSection');
const appShell = document.getElementById('appShell');
const authStatus = document.getElementById('authStatus');
const sessionLabel = document.getElementById('sessionLabel');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const myAccountBtn = document.getElementById('myAccountBtn');
const rolePage = document.getElementById('rolePage');
const loginPage = document.getElementById('loginPage');
const registerPage = document.getElementById('registerPage');
const chooseCustomerBtn = document.getElementById('chooseCustomer');
const chooseEmployeeBtn = document.getElementById('chooseEmployee');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTitle = document.getElementById('loginTitle');
const registerTitle = document.getElementById('registerTitle');
const goToRegisterBtn = document.getElementById('goToRegisterBtn');
const backToRoleBtn = document.getElementById('backToRoleBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const customerRegisterFields = document.getElementById('customerRegisterFields');
const employeeRegisterFields = document.getElementById('employeeRegisterFields');
const employeeHotelSelect = document.getElementById('employeeHotelSelect');

const searchForm = document.getElementById('searchForm');
const resetBtn = document.getElementById('resetBtn');
const searchSection = document.getElementById('searchSection');
const resultsSection = document.getElementById('resultsSection');
const viewsSection = document.getElementById('viewsSection');
const resultsDiv = document.getElementById('results');
const statusMessage = document.getElementById('statusMessage');
const customerDashboardPage = document.getElementById('customerDashboardPage');
const customerAccountPage = document.getElementById('customerAccountPage');
const employeeSection = document.getElementById('employeeSection');
const adminSection = document.getElementById('adminSection');

const bookingForm = document.getElementById('bookingForm');
const customerProfileForm = document.getElementById('customerProfileForm');
const reloadCustomerProfileBtn = document.getElementById('reloadCustomerProfileBtn');
const deleteCustomerAccountBtn = document.getElementById('deleteCustomerAccountBtn');
const customerProfileStatus = document.getElementById('customerProfileStatus');
const checkinForm = document.getElementById('checkinForm');
const directRentingForm = document.getElementById('directRentingForm');
const paymentForm = document.getElementById('paymentForm');

const crudStatus = document.getElementById('crudStatus');
const crudOutput = document.getElementById('crudOutput');
const viewsOutput = document.getElementById('viewsOutput');

const dashboardStatus = document.getElementById('dashboardStatus');

const customerBookings = document.getElementById('customerBookings');

const chainSelect = document.getElementById('chainId');
const ratingSelect = document.getElementById('rating');
const capacitySelect = document.getElementById('capacity');

let searchTimer;
let currentSession = null;
let selectedRole = null;
let customerPage = 'dashboard';

function closeCustomerDialogs() {
	if (customerDashboardPage.open) {
		customerDashboardPage.close();
	}
	if (customerAccountPage.open) {
		customerAccountPage.close();
	}
}

function openCustomerDialog(dialog) {
	if (!dialog.open) {
		dialog.showModal();
	}
}

async function apiFetch(path, options = {}) {
	const response = await fetch(`${API_BASE}${path}`, {
		headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
		...options
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(data.error || `Request failed: ${response.status}`);
	}
	return data;
}

function applyRoleUI() {
	if (!currentSession) {
		authSection.classList.remove('hidden');
		appShell.classList.add('hidden');
		searchSection.classList.add('hidden');
		resultsSection.classList.add('hidden');
		viewsSection.classList.add('hidden');
		closeCustomerDialogs();
		employeeSection.classList.add('hidden');
		adminSection.classList.add('hidden');
		return;
	}

	authSection.classList.add('hidden');
	appShell.classList.remove('hidden');

	const isCustomer = currentSession.role === 'customer';
	searchSection.classList.remove('hidden');
	resultsSection.classList.remove('hidden');
	employeeSection.classList.toggle('hidden', isCustomer);
	adminSection.classList.toggle('hidden', isCustomer);
	viewsSection.classList.toggle('hidden', isCustomer);
	myAccountBtn.classList.toggle('hidden', !isCustomer);
	dashboardBtn.classList.toggle('hidden', !isCustomer);

	if (isCustomer) {
		closeCustomerDialogs();
		if (customerPage === 'account') {
			openCustomerDialog(customerAccountPage);
		} else if (customerPage === 'dashboard') {
			openCustomerDialog(customerDashboardPage);
		}
	} else {
		closeCustomerDialogs();
	}

	sessionLabel.textContent = `Logged in as ${currentSession.role} (${currentSession.username}) - profile #${currentSession.profileId}`;
	if (isCustomer) {
		document.getElementById('bookingCustId').value = currentSession.profileId;
	}
	if (!isCustomer) {
		checkinForm.elements.emp_id.value = currentSession.profileId;
		directRentingForm.elements.emp_id.value = currentSession.profileId;
	}
}

function showAuthPage(page) {
	rolePage.classList.toggle('hidden', page !== 'role');
	loginPage.classList.toggle('hidden', page !== 'login');
	registerPage.classList.toggle('hidden', page !== 'register');
}

function showCustomerPage(page) {
	customerPage = page;
	applyRoleUI();
}

function configureRole(role) {
	selectedRole = role;
	loginTitle.textContent = role === 'customer' ? 'Customer Login' : 'Employee Login';
	registerTitle.textContent = role === 'customer' ? 'Create Customer Account' : 'Create Employee Account';

	customerRegisterFields.classList.toggle('hidden', role !== 'customer');
	employeeRegisterFields.classList.toggle('hidden', role !== 'employee');

	const customerFields = customerRegisterFields.querySelectorAll('input, select, textarea');
	const employeeFields = employeeRegisterFields.querySelectorAll('input, select, textarea');
	customerFields.forEach(field => {
		field.required = role === 'customer' && ['full_name', 'id_type', 'id_number'].includes(field.name);
	});
	employeeFields.forEach(field => {
		field.required = role === 'employee' && ['hotel_id', 'ssn_sin', 'employee_full_name'].includes(field.name);
	});
}

async function loadHotelsForRegistration() {
	const hotels = await apiFetch('/api/hotels');
	employeeHotelSelect.innerHTML = '<option value="">Select hotel</option>' + hotels
		.map(h => `<option value="${h.hotel_id}">${h.hotel_id} - ${h.name}</option>`)
		.join('');
}

function buildQueryString(formData) {
	const params = new URLSearchParams();
	for (const [key, value] of formData.entries()) {
		if (String(value).trim() !== '') {
			params.append(key, String(value).trim());
		}
	}
	return params.toString();
}

function fillBookingRoom(roomId) {
	document.getElementById('bookingRoomId').value = roomId;
}

function fillDirectRentingRoom(roomId) {
	directRentingForm.elements.room_id.value = roomId;
}

function renderRooms(rooms) {
	resultsDiv.innerHTML = '';
	if (!rooms.length) {
		statusMessage.textContent = 'No rooms found for selected criteria.';
		return;
	}

	statusMessage.textContent = `${rooms.length} room(s) found.`;

	rooms.forEach(room => {
		const card = document.createElement('div');
		card.className = 'room-card';
		const isCustomer = currentSession?.role === 'customer';
		const actionLabel = isCustomer ? 'Book This Room' : 'Use For Direct Renting';
		card.innerHTML = `
			<h3>${room.chain_name} - ${room.hotel_name} - Room ${room.room_number}</h3>
			<p><strong>Room ID:</strong> ${room.room_id}</p>
			<p><strong>Capacity:</strong> ${room.capacity}</p>
			<p><strong>Price:</strong> $${room.price}</p>
			<p><strong>Area:</strong> ${room.address}</p>
			<p><strong>Hotel Category:</strong> ${room.rating} star</p>
			<p><strong>Total Rooms in Hotel:</strong> ${room.total_rooms}</p>
			<button type="button" data-room="${room.room_id}">${actionLabel}</button>
		`;

		card.querySelector('button').addEventListener('click', () => {
			if (isCustomer) {
				fillBookingRoom(room.room_id);
				showCustomerPage('dashboard');
				statusMessage.textContent = `Selected room ${room.room_id} for booking.`;
			} else {
				fillDirectRentingRoom(room.room_id);
				statusMessage.textContent = `Selected room ${room.room_id} for direct renting.`;
			}
		});
		resultsDiv.appendChild(card);
	});
}

async function searchRooms(event) {
	if (event) {
		event.preventDefault();
	}
	statusMessage.textContent = 'Loading...';
	resultsDiv.innerHTML = '';

	try {
		const formData = new FormData(searchForm);
		const query = buildQueryString(formData);
		const rooms = await apiFetch(`/api/rooms/available${query ? `?${query}` : ''}`);
		renderRooms(rooms);
	} catch (error) {
		statusMessage.textContent = `Error: ${error.message}`;
	}
}

function queueSearch() {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => searchRooms(), 250);
}

async function loadFilters() {
	const data = await apiFetch('/api/filters');

	chainSelect.innerHTML = '<option value="">Any</option>' + data.chains
		.map(chain => `<option value="${chain.chain_id}">${chain.name}</option>`)
		.join('');

	ratingSelect.innerHTML = '<option value="">Any</option>' + data.ratings
		.map(r => `<option value="${r}">${r}</option>`)
		.join('');

	capacitySelect.innerHTML = '<option value="">Any</option>' + data.capacities
		.map(c => `<option value="${c}">${c}</option>`)
		.join('');
}

async function createBooking(event) {
	event.preventDefault();
	if (!currentSession || currentSession.role !== 'customer') {
		statusMessage.textContent = 'Only customer role can create bookings.';
		return;
	}
	const payload = Object.fromEntries(new FormData(bookingForm).entries());
	payload.cust_id = currentSession.profileId;
	try {
		const booking = await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
		const checkInDate = new Date(booking.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
		const checkOutDate = new Date(booking.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
		dashboardStatus.textContent = `✅ Booking #${booking.book_id} confirmed! Check-in: ${checkInDate}, Check-out: ${checkOutDate}`;
		searchRooms();
		loadCustomerBookings();
	} catch (error) {
		dashboardStatus.textContent = `❌ Booking failed: ${error.message}`;
	}
}

async function loadCustomerProfile() {
	if (!currentSession || currentSession.role !== 'customer') {
		return;
	}

	try {
		const profile = await apiFetch(`/api/customers/${currentSession.profileId}/self?userId=${currentSession.id}`);
		customerProfileForm.elements.full_name.value = profile.full_name || '';
		customerProfileForm.elements.address.value = profile.address || '';
		customerProfileForm.elements.id_type.value = profile.id_type || '';
		customerProfileForm.elements.id_number.value = profile.id_number || '';
		customerProfileForm.elements.username.value = profile.username || '';
		customerProfileForm.elements.password.value = '';
		customerProfileStatus.textContent = '';
	} catch (error) {
		customerProfileStatus.textContent = `Failed to load profile: ${error.message}`;
	}
}

async function loadCustomerBookings() {
	if (!currentSession || currentSession.role !== 'customer') {
		return;
	}

	try {
		const bookings = await apiFetch(`/api/customers/${currentSession.profileId}/bookings`);
		customerBookings.innerHTML = '';
		if (!bookings.length) {
			customerBookings.innerHTML = '<p>No bookings found.</p>';
			return;
		}
		const list = document.createElement('ul');
		bookings.forEach(booking => {
			const li = document.createElement('li');
			const checkIn = new Date(booking.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
			const checkOut = new Date(booking.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
			li.textContent = `Booking #${booking.book_id}: Room ${booking.room_number} at ${booking.hotel_name} (${booking.address}) from ${checkIn} to ${checkOut}`;
			list.appendChild(li);
		});
		customerBookings.appendChild(list);
	} catch (error) {
		customerBookings.innerHTML = `<p>Failed to load bookings: ${error.message}</p>`;
	}
}

async function updateCustomerProfile(event) {
	event.preventDefault();
	if (!currentSession || currentSession.role !== 'customer') {
		customerProfileStatus.textContent = 'Only customer role can update this profile.';
		return;
	}

	const payload = Object.fromEntries(new FormData(customerProfileForm).entries());
	payload.user_id = currentSession.id;

	if (!payload.password) {
		delete payload.password;
	}

	try {
		const result = await apiFetch(`/api/customers/${currentSession.profileId}/self`, {
			method: 'PUT',
			body: JSON.stringify(payload)
		});
		currentSession.username = result.profile.username;
		sessionLabel.textContent = `Logged in as ${currentSession.role} (${currentSession.username}) - profile #${currentSession.profileId}`;
		customerProfileStatus.textContent = 'Profile/account updated successfully.';
		customerProfileForm.elements.password.value = '';
	} catch (error) {
		customerProfileStatus.textContent = `Update failed: ${error.message}`;
	}
}

async function deleteCustomerAccount() {
	if (!currentSession || currentSession.role !== 'customer') {
		customerProfileStatus.textContent = 'Only customer role can delete this account.';
		return;
	}

	const confirmed = window.confirm('Delete your account and customer profile permanently? This cannot be undone.');
	if (!confirmed) {
		return;
	}

	try {
		await apiFetch(`/api/customers/${currentSession.profileId}/self`, {
			method: 'DELETE',
			body: JSON.stringify({ user_id: currentSession.id })
		});
		alert('Your account was deleted successfully.');
		logout();
	} catch (error) {
		customerProfileStatus.textContent = `Delete failed: ${error.message}`;
	}
}

async function convertCheckin(event) {
	event.preventDefault();
	if (!currentSession || currentSession.role !== 'employee') {
		statusMessage.textContent = 'Only employee role can convert booking to renting.';
		return;
	}
	const payload = Object.fromEntries(new FormData(checkinForm).entries());
	try {
		const renting = await apiFetch(`/api/bookings/${payload.booking_id}/checkin`, {
			method: 'POST',
			body: JSON.stringify({ emp_id: Number(currentSession.profileId) })
		});
		statusMessage.textContent = `Booking converted to renting ${renting.rent_id}.`;
	} catch (error) {
		statusMessage.textContent = `Check-in failed: ${error.message}`;
	}
}

async function createDirectRenting(event) {
	event.preventDefault();
	if (!currentSession || currentSession.role !== 'employee') {
		statusMessage.textContent = 'Only employee role can create direct renting.';
		return;
	}
	const payload = Object.fromEntries(new FormData(directRentingForm).entries());
	payload.emp_id = currentSession.profileId;
	try {
		const renting = await apiFetch('/api/rentings/direct', { method: 'POST', body: JSON.stringify(payload) });
		statusMessage.textContent = `Direct renting created with id ${renting.rent_id}.`;
	} catch (error) {
		statusMessage.textContent = `Direct renting failed: ${error.message}`;
	}
}

async function addPayment(event) {
	event.preventDefault();
	if (!currentSession || currentSession.role !== 'employee') {
		statusMessage.textContent = 'Only employee role can insert payments.';
		return;
	}
	const payload = Object.fromEntries(new FormData(paymentForm).entries());
	try {
		const renting = await apiFetch(`/api/rentings/${payload.rent_id}/payments`, {
			method: 'POST',
			body: JSON.stringify({ amount: Number(payload.amount) })
		});
		statusMessage.textContent = `Payment added. Total amount paid: ${renting.amount_paid}`;
	} catch (error) {
		statusMessage.textContent = `Payment failed: ${error.message}`;
	}
}

function buildCrudConfig(formId) {
	if (formId === 'customerCrudForm') {
		return { base: '/api/customers', fields: ['full_name', 'address', 'id_type', 'id_number'] };
	}
	if (formId === 'employeeCrudForm') {
		return { base: '/api/employees', fields: ['hotel_id', 'ssn_sin', 'full_name', 'address', 'role'] };
	}
	if (formId === 'hotelCrudForm') {
		return { base: '/api/hotels', fields: ['chain_id', 'name', 'rating', 'address', 'email', 'phone', 'manager_id'] };
	}
	return { base: '/api/rooms', fields: ['hotel_id', 'room_number', 'price', 'capacity', 'view_type', 'extendable', 'status'] };
}

async function handleCrud(form, action) {
	if (!currentSession || currentSession.role !== 'employee') {
		crudStatus.textContent = 'Only employee role can use CRUD management.';
		return;
	}

	const config = buildCrudConfig(form.id);
	const formData = Object.fromEntries(new FormData(form).entries());
	const id = formData.id;
	const payload = {};
	config.fields.forEach(field => {
		if (formData[field] !== undefined && formData[field] !== '') {
			payload[field] = formData[field];
		}
	});

	try {
		let result;
		if (action === 'create') {
			result = await apiFetch(config.base, { method: 'POST', body: JSON.stringify(payload) });
		}
		if (action === 'update') {
			result = await apiFetch(`${config.base}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
		}
		if (action === 'delete') {
			result = await apiFetch(`${config.base}/${id}`, { method: 'DELETE' });
		}
		if (action === 'list') {
			result = await apiFetch(config.base);
		}

		crudStatus.textContent = `${form.id.replace('CrudForm', '')} ${action} successful.`;
		crudOutput.textContent = JSON.stringify(result, null, 2);
	} catch (error) {
		crudStatus.textContent = `${form.id.replace('CrudForm', '')} ${action} failed: ${error.message}`;
	}
}

function wireCrudForm(formId) {
	const form = document.getElementById(formId);
	form.querySelectorAll('button[data-action]').forEach(button => {
		button.addEventListener('click', () => handleCrud(form, button.dataset.action));
	});
}

async function loadView1() {
	const data = await apiFetch('/api/views/available-rooms-per-area');
	viewsOutput.textContent = JSON.stringify(data, null, 2);
}

async function loadView2() {
	const data = await apiFetch('/api/views/hotel-capacity');
	viewsOutput.textContent = JSON.stringify(data, null, 2);
}

function bindLiveCriteriaSearch() {
	const liveFields = searchForm.querySelectorAll('input, select');
	liveFields.forEach(field => {
		field.addEventListener('input', queueSearch);
		field.addEventListener('change', queueSearch);
	});
}


function showLogin(role) {
	configureRole(role);
	loginForm.reset();
	registerForm.reset();
	showAuthPage('login');
	authStatus.textContent = '';
}

async function login(event) {
	event.preventDefault();
	if (!selectedRole) {
		authStatus.textContent = 'Please choose a role first.';
		showAuthPage('role');
		return;
	}

	const payload = Object.fromEntries(new FormData(loginForm).entries());
	try {
		const data = await apiFetch('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ ...payload, role: selectedRole })
		});
		currentSession = {
			role: data.user.role,
			id: data.user.user_id,
			profileId: data.user.role === 'customer' ? data.user.cust_id : data.user.emp_id,
			username: data.user.username
		};
		customerPage = null;
		applyRoleUI();
		if (currentSession.role === 'customer') {
			await loadCustomerProfile();
		}
		searchRooms();
	} catch (error) {
		authStatus.textContent = `Login failed: ${error.message}`;
	}
}

async function register(event) {
	event.preventDefault();
	if (!selectedRole) {
		authStatus.textContent = 'Please choose a role first.';
		showAuthPage('role');
		return;
	}

	const formData = new FormData(registerForm);
	const username = String(formData.get('username') || '').trim();
	const password = String(formData.get('password') || '').trim();
	const payload = { role: selectedRole, username, password };

	if (selectedRole === 'customer') {
		payload.full_name = String(formData.get('full_name') || '').trim();
		payload.address = String(formData.get('address') || '').trim();
		payload.id_type = String(formData.get('id_type') || '').trim();
		payload.id_number = String(formData.get('id_number') || '').trim();
	} else {
		payload.hotel_id = String(formData.get('hotel_id') || '').trim();
		payload.ssn_sin = String(formData.get('ssn_sin') || '').trim();
		payload.full_name = String(formData.get('employee_full_name') || '').trim();
		payload.address = String(formData.get('employee_address') || '').trim();
		payload.employee_role = String(formData.get('employee_role') || '').trim();
	}

	try {
		await apiFetch('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		authStatus.textContent = 'Account created successfully. Please login.';
		showAuthPage('login');
		loginForm.elements.username.value = payload.username;
		loginForm.elements.password.value = '';
		registerForm.reset();
	} catch (error) {
		authStatus.textContent = `Registration failed: ${error.message}`;
	}
}

function logout() {
	currentSession = null;
	closeCustomerDialogs();
	applyRoleUI();
	showAuthPage('role');
	selectedRole = null;
	loginForm.reset();
	registerForm.reset();
	searchForm.reset();
	resultsDiv.innerHTML = '';
	statusMessage.textContent = '';
}

window.addEventListener('DOMContentLoaded', async () => {
	try {
		await loadFilters();
		await loadHotelsForRegistration();
		applyRoleUI();
		showAuthPage('role');
		bindLiveCriteriaSearch();
	} catch (error) {
		statusMessage.textContent = `Initialization failed: ${error.message}`;
	}

	chooseCustomerBtn.addEventListener('click', () => showLogin('customer'));
	chooseEmployeeBtn.addEventListener('click', () => showLogin('employee'));
	goToRegisterBtn.addEventListener('click', () => {
		if (!selectedRole) {
			showAuthPage('role');
			return;
		}
		registerForm.reset();
		authStatus.textContent = '';
		showAuthPage('register');
	});
	backToRoleBtn.addEventListener('click', () => {
		selectedRole = null;
		showAuthPage('role');
		authStatus.textContent = '';
	});
	backToLoginBtn.addEventListener('click', () => {
		showAuthPage('login');
		authStatus.textContent = '';
	});
	loginForm.addEventListener('submit', login);
	registerForm.addEventListener('submit', register);
	logoutBtn.addEventListener('click', logout);
	dashboardBtn.addEventListener('click', () => {
		if (currentSession?.role === 'customer') {
			dashboardStatus.textContent = '';
			showCustomerPage('dashboard');
			loadCustomerBookings();
		}
	});
	myAccountBtn.addEventListener('click', () => {
		if (currentSession?.role === 'customer') {
			showCustomerPage('account');
		}
	});
	document.getElementById('dialogCloseDashboardBtn').addEventListener('click', () => customerDashboardPage.close());
	document.getElementById('dialogCloseAccountBtn').addEventListener('click', () => customerAccountPage.close());
	customerDashboardPage.addEventListener('close', () => {
		if (currentSession?.role === 'customer' && customerPage === 'dashboard') {
			customerPage = 'dashboard';
		}
	});
	customerAccountPage.addEventListener('close', () => {
		if (currentSession?.role === 'customer' && customerPage === 'account') {
			customerPage = 'dashboard';
			applyRoleUI();
		}
	});

	searchForm.addEventListener('submit', searchRooms);
	resetBtn.addEventListener('click', () => {
		searchForm.reset();
		searchRooms();
	});

	bookingForm.addEventListener('submit', createBooking);
	customerProfileForm.addEventListener('submit', updateCustomerProfile);
	reloadCustomerProfileBtn.addEventListener('click', () => loadCustomerProfile());
	deleteCustomerAccountBtn.addEventListener('click', deleteCustomerAccount);
	backToDashboardBtn.addEventListener('click', () => {
		if (currentSession?.role === 'customer') {
			showCustomerPage('dashboard');
		}
	});
	checkinForm.addEventListener('submit', convertCheckin);
	directRentingForm.addEventListener('submit', createDirectRenting);
	paymentForm.addEventListener('submit', addPayment);

	wireCrudForm('customerCrudForm');
	wireCrudForm('employeeCrudForm');
	wireCrudForm('hotelCrudForm');
	wireCrudForm('roomCrudForm');

	document.getElementById('loadView1').addEventListener('click', () => loadView1().catch(err => { viewsOutput.textContent = err.message; }));
	document.getElementById('loadView2').addEventListener('click', () => loadView2().catch(err => { viewsOutput.textContent = err.message; }));
});
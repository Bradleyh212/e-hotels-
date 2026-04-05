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

	// Populate CRUD dropdowns for employee role
	if (!isCustomer) {
		populateHotelsForCrud();
		populateChainsForCrud();
		refreshBookingDropdown();
	}

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

	sessionLabel.textContent = `Logged in as ${currentSession.role} (${currentSession.username}) - profile id : ${currentSession.profileId}`;
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

async function loadChainsForRegistration() {
	const chains = await apiFetch('/api/chains');
	employeeHotelSelect.innerHTML = '<option value="">Select hotel chain</option>' + chains
		.map(c => `<option value="${c.chain_id}">${c.name}</option>`)
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
			<p><strong>Rating:</strong> ${room.rating} star</p>
			<p><strong>Total Rooms in Hotel:</strong> ${room.total_rooms}</p>
			<details>
				<summary>More details</summary>
				<p><strong>Room View:</strong> ${room.view_type || 'N/A'}</p>
				<p><strong>Extendable:</strong> ${room.extendable ? 'Yes' : 'No'}</p>
				<p><strong>Status:</strong> ${room.status}</p>
				<p><strong>Email:</strong> ${room.hotel_email || 'N/A'}</p>
				<p><strong>Phone:</strong> ${room.hotel_phone || 'N/A'}</p>
				<p><strong>Amenities:</strong> ${room.amenities?.length ? room.amenities.join(', ') : 'None listed'}</p>
			</details>
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
    if (!currentSession || currentSession.role !== 'employee') return;

    const payload = Object.fromEntries(new FormData(checkinForm).entries());
    try {
        const renting = await apiFetch(`/api/bookings/${payload.booking_id}/checkin`, {
            method: 'POST',
            body: JSON.stringify({ emp_id: Number(currentSession.profileId) })
        });
        showEmployeeMessage(`✅ Successfully converted Booking #${payload.booking_id} to Renting #${renting.rent_id}`);
        employeeActionOutput.textContent = JSON.stringify(renting, null, 2);
        refreshBookingDropdown(); // Refresh list after conversion
    } catch (error) {
        showEmployeeMessage(`❌ Check-in failed: ${error.message}`, true);
        employeeActionOutput.textContent = '';
    }
}

async function createDirectRenting(event) {
    event.preventDefault();
    if (!currentSession || currentSession.role !== 'employee') return;

    const payload = Object.fromEntries(new FormData(directRentingForm).entries());
    payload.emp_id = currentSession.profileId;
    try {
        const renting = await apiFetch('/api/rentings/direct', { method: 'POST', body: JSON.stringify(payload) });
        showEmployeeMessage(`✅ Direct Renting #${renting.rent_id} created successfully!`);
        employeeActionOutput.textContent = JSON.stringify(renting, null, 2);
    } catch (error) {
        showEmployeeMessage(`❌ Direct Renting failed: ${error.message}`, true);
        employeeActionOutput.textContent = '';
    }
}

async function addPayment(event) {
    event.preventDefault();
    if (!currentSession || currentSession.role !== 'employee') return;

    // Use the corrected 'paymentForm' variable
    const payload = Object.fromEntries(new FormData(paymentForm).entries());
    try {
        const renting = await apiFetch(`/api/rentings/${payload.rent_id}/payments`, {
            method: 'POST',
            body: JSON.stringify({ amount: Number(payload.amount) })
        });
        showEmployeeMessage(`✅ Payment of $${payload.amount} added to Renting #${payload.rent_id}`);
        employeeActionOutput.textContent = `New Total Paid: $${renting.amount_paid}`;
    } catch (error) {
        showEmployeeMessage(`❌ Payment failed: ${error.message}`, true);
        employeeActionOutput.textContent = '';
    }
}

function buildCrudConfig(formId) {
	if (formId === 'customerCrudForm') {
		return { base: '/api/customers', fields: ['full_name', 'address', 'id_type', 'id_number'] };
	}
	if (formId === 'employeeCrudForm') {
		return { base: '/api/employees', fields: ['chain_id', 'ssn_sin', 'full_name', 'address', 'role'] };
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

	if (action !== 'delete' && action !== 'list') {
		if (!validateCrudForm(form)) {
			return;
		}
	}

	const formId = form.getAttribute('id');
	const config = buildCrudConfig(formId);
	const formData = Object.fromEntries(new FormData(form).entries());
	const id = formData.id;
	const payload = {};
	const entity = formId.replace('CrudForm', '');

	// ID required for update/delete
	if ((action === 'update' || action === 'delete') && !id) {
		showCrudMessage(`❌ ${entity} ${action} failed: ID is required`, true);
		crudOutput.textContent = '';
		return;
	}

	config.fields.forEach(field => {
		if (formData[field] !== undefined && formData[field] !== '') {
			let value = formData[field];

			if (field === 'price' || field === 'chain_id' || field === 'hotel_id' || field === 'manager_id') {
				value = parseFloat(value);
			}

			if (field === 'extendable') {
				value = value === 'true' ? true : value === 'false' ? false : !!value;
			}

			if (field === 'rating') {
				value = parseInt(value);
			}

			payload[field] = value;
		}
	});

	try {
		let result;

		if (action === 'create') {
			result = await apiFetch(config.base, {
				method: 'POST',
				body: JSON.stringify(payload)
			});
		}

		if (action === 'update') {
			result = await apiFetch(`${config.base}/${id}`, {
				method: 'PUT',
				body: JSON.stringify(payload)
			});
		}

		if (action === 'delete') {
			result = await apiFetch(`${config.base}/${id}`, {
				method: 'DELETE'
			});
		}

		if (action === 'list') {
			result = await apiFetch(config.base);
		}

		let createdId = '';

		if (entity === 'employee') {
			createdId = result?.emp_id || '';
		} else if (entity === 'customer') {
			createdId = result?.cust_id || '';
		} else if (entity === 'hotel') {
			createdId = result?.hotel_id || '';
		} else if (entity === 'room') {
			createdId = result?.room_id || '';
		} else {
			createdId =
				result?.id ||
				result?.emp_id ||
				result?.cust_id ||
				result?.hotel_id ||
				result?.room_id ||
				result?.chain_id ||
				'';
		}

		if (action === 'create') {
			showCrudMessage(`✅ ${entity} created successfully!`, false);
			crudOutput.textContent = createdId
				? `${entity} ID: ${createdId}`
				: JSON.stringify(result, null, 2);

			const idInput = form.querySelector('input[name="id"]');
			if (idInput && createdId) {
				idInput.value = createdId;
			}
		} else if (action === 'update') {
			showCrudMessage(`✅ ${entity} updated successfully!`, false);
			crudOutput.textContent = JSON.stringify(result, null, 2);
		} else if (action === 'delete') {
			showCrudMessage(`✅ ${entity} deleted successfully!`, false);
			crudOutput.textContent = JSON.stringify(result, null, 2);

			const idInput = form.querySelector('input[name="id"]');
			if (idInput) {
				idInput.value = '';
			}
		} else if (action === 'list') {
			showCrudMessage(`✅ ${entity} list loaded successfully!`, false);
			crudOutput.textContent = JSON.stringify(result, null, 2);
		}
	} catch (error) {
		console.error('CRUD caught error:', error);

		let message = error.message || 'Unknown error';

		if (message.includes('duplicate')) {
			message = 'Duplicate entry already exists';
		}
		if (message.includes('null value')) {
			message = 'Missing required fields';
		}
		if (message.includes('SSN/SIN already exists')) {
			message = 'An employee with this SSN/SIN already exists';
		}
		if (message.includes('A customer with this ID already exists')) {
			message = 'A customer with this ID already exists';
		}
		if (message.includes('ID is required')) {
			message = 'ID is required';
		}

		showCrudMessage(`❌ ${entity} ${action} failed: ${message}`, true);
		crudOutput.textContent = '';
	}
		}
		const employeeActionStatus = document.getElementById('employeeActionStatus');
		const employeeActionOutput = document.getElementById('employeeActionOutput');
		const bookingIdSelect = document.getElementById('bookingIdSelect');

		function showEmployeeMessage(message, isError = false) {
			employeeActionStatus.textContent = message;
			employeeActionStatus.style.color = isError ? 'red' : 'green';
			employeeActionStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}

		// Function to fetch all bookings and populate the dropdown
		async function refreshBookingDropdown() {
			try {
				const bookings = await apiFetch('/api/bookings'); 
				// If bookings is an empty array [], show a friendly message instead of an error
				if (bookings.length === 0) {
					bookingIdSelect.innerHTML = '<option value="">No upcoming reservations</option>';
					return;
				}
				bookingIdSelect.innerHTML = '<option value="">-- Select a Booking --</option>' + 
					bookings.map(b => `<option value="${b.book_id}">ID: ${b.book_id} | Cust: ${b.cust_id} | Room: ${b.room_id}</option>`).join('');
			} catch (error) {
				console.error("Backend Error:", error); // This tells you if the route is missing
				bookingIdSelect.innerHTML = '<option value="">Error: Check Backend API</option>';
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

async function populateHotelsForCrud() {
	try {
		const hotels = await apiFetch('/api/hotels');
		if (!Array.isArray(hotels)) return;

		// Populate hotel select for room form (showing hotel names)
		const roomHotelSelect = document.querySelector('#roomCrudForm .hotel-name-select');
		if (roomHotelSelect) {
			roomHotelSelect.innerHTML = '<option value="">-- Select Hotel --</option>';
			hotels.forEach(hotel => {
				const option = document.createElement('option');
				option.value = hotel.hotel_id;
				option.textContent = `${hotel.name}`;
				roomHotelSelect.appendChild(option);
			});
		}
	} catch (error) {
		console.error('Error loading hotels for CRUD:', error);
	}
}

async function populateChainsForCrud() {
	try {
		const chains = await apiFetch('/api/chains');
		if (!Array.isArray(chains)) return;

		// Populate chain select for employee form
		const employeeChainSelect = document.querySelector('#employeeCrudForm .chain-select');
		if (employeeChainSelect) {
			employeeChainSelect.innerHTML = '<option value="">-- Select Chain --</option>';
			chains.forEach(chain => {
				const option = document.createElement('option');
				option.value = chain.chain_id;
				option.textContent = `${chain.name}`;
				employeeChainSelect.appendChild(option);
			});
		}

		const chainSelect = document.querySelector('#hotelCrudForm .chain-select');
		if (chainSelect) {
			chainSelect.innerHTML = '<option value="">-- Select Chain --</option>';
			chains.forEach(chain => {
				const option = document.createElement('option');
				option.value = chain.chain_id;
				option.textContent = `${chain.name} (ID: ${chain.chain_id})`;
				chainSelect.appendChild(option);
			});
		}
	} catch (error) {
		console.error('Error loading chains for CRUD:', error);
	}
}

function validateCrudForm(form) {
	// Validate numeric fields in room form
	const priceInput = form.querySelector('input[name="price"]');
	if (priceInput && priceInput.value) {
		const price = parseFloat(priceInput.value);
		if (isNaN(price) || price <= 0) {
			alert('Price must be a valid positive number');
			return false;
		}
	}

	// Validate hotel_id is selected
	const hotelIdSelect = form.querySelector('select[name="hotel_id"]');
	if (hotelIdSelect && hotelIdSelect.required && !hotelIdSelect.value) {
		alert('Please select a hotel');
		return false;
	}

	// Validate capacity is selected
	const capacitySelect = form.querySelector('select[name="capacity"]');
	if (capacitySelect && capacitySelect.required && !capacitySelect.value) {
		alert('Please select a capacity');
		return false;
	}

	// Validate chain_id is selected
	const chainIdSelect = form.querySelector('select[name="chain_id"]');
	if (chainIdSelect && chainIdSelect.required && !chainIdSelect.value) {
		alert('Please select a chain');
		return false;
	}

	// Validate rating is selected
	const ratingSelect = form.querySelector('select[name="rating"]');
	if (ratingSelect && ratingSelect.required && !ratingSelect.value) {
		alert('Please select a rating');
		return false;
	}

	return true;
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

function showCrudMessage(message, isError = false) {
	crudStatus.textContent = message;
	crudStatus.style.color = isError ? 'red' : 'green';
	crudStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

window.addEventListener('DOMContentLoaded', async () => {
	try {
		await loadFilters();
		await loadChainsForRegistration();
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
// Function to handle tab switching
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
    
    // Refresh data when switching
    loadManagementTables();
}

// Function to load the management data
async function loadManagementTables() {
    try {
        // Load Rentings
        const rentings = await apiFetch('/api/rentings');
        const rBody = document.getElementById('rentingsTableBody');
        rBody.innerHTML = rentings.map(r => `
            <tr>
                <td>${r.rent_id}</td>
                <td>Room ${r.room_id}</td>
                <td>Cust ${r.cust_id}</td>
                <td>${new Date(r.checkin_date).toLocaleDateString()}</td>
                <td>${new Date(r.checkout_date).toLocaleDateString()}</td>
            </tr>
        `).join('');

        // Load Archived Bookings
        const archives = await apiFetch('/api/archives/bookings');
        const aBody = document.getElementById('archiveBookingsTableBody');
        aBody.innerHTML = archives.map(a => `
            <tr>
                <td>${a.old_book_id}</td>
                <td>${a.customer_name}</td>
                <td>${a.hotel_name}</td>
                <td>${a.room_number}</td>
                <td>${new Date(a.start_date).toLocaleDateString()} - ${new Date(a.end_date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Error loading management tables:", error);
    }
}

// Call this inside your existing applyRoleUI() function if user is an employee
// loadManagementTables();
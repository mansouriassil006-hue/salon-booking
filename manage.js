let currentTel = null;
let currentCode = null;
let currentBooking = null;
let rescheduleSelectedCoiffeurId = null;
let rescheduleSelectedCoiffeurWhatsapp = null;
let rescheduleSelectedSlot = null;

const lookupCard = document.getElementById('lookupCard');
const lookupTel = document.getElementById('lookupTel');
const lookupCode = document.getElementById('lookupCode');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMessage = document.getElementById('lookupMessage');

const detailsCard = document.getElementById('detailsCard');
const detCoiffeur = document.getElementById('detCoiffeur');
const detService = document.getElementById('detService');
const detDate = document.getElementById('detDate');
const detTime = document.getElementById('detTime');
const tooLateNotice = document.getElementById('tooLateNotice');
const actionButtons = document.getElementById('actionButtons');
const showRescheduleBtn = document.getElementById('showRescheduleBtn');
const cancelBtn = document.getElementById('cancelBtn');
const actionMessage = document.getElementById('actionMessage');

const rescheduleCard = document.getElementById('rescheduleCard');
const rescheduleCoiffeurSelect = document.getElementById('rescheduleCoiffeurSelect');
const rescheduleSlotsSection = document.getElementById('rescheduleSlotsSection');
const rescheduleSlotsContainer = document.getElementById('rescheduleSlotsContainer');
const confirmRescheduleBtn = document.getElementById('confirmRescheduleBtn');
const backFromRescheduleBtn = document.getElementById('backFromRescheduleBtn');
const rescheduleMessage = document.getElementById('rescheduleMessage');

const successCard = document.getElementById('successCard');
const successTitle = document.getElementById('successTitle');
const successText = document.getElementById('successText');
const successWhatsappBtn = document.getElementById('successWhatsappBtn');

lookupBtn.addEventListener('click', doLookup);

async function doLookup() {
  hideBox(lookupMessage);

  const tel = lookupTel.value.trim();
  const code = lookupCode.value.trim();

  if (!tel) return showBox(lookupMessage, 'الرجاء إدخال رقم الهاتف', true);
  if (!code) return showBox(lookupMessage, 'الرجاء إدخال كود الحجز', true);

  lookupBtn.disabled = true;
  lookupBtn.textContent = 'جاري البحث...';

  const { data, error } = await supabaseClient.rpc('get_my_booking', {
    p_telephone: tel,
    p_code: code
  });

  lookupBtn.disabled = false;
  lookupBtn.textContent = 'بحث عن حجزي';

  if (error || !data || data.length === 0) {
    return showBox(lookupMessage, 'لم يتم العثور على حجز بهذه المعلومات.', true);
  }

  currentTel = tel;
  currentCode = code;
  currentBooking = data[0];

  showDetails();
}

function showDetails() {
  lookupCard.style.display = 'none';
  detailsCard.style.display = 'block';

  detCoiffeur.textContent = currentBooking.coiffeur_name;
  detService.textContent = currentBooking.service_name;
  detDate.textContent = currentBooking.booking_date;
  detTime.textContent = currentBooking.start_time.substring(0, 5);

  if (currentBooking.can_modify) {
    tooLateNotice.style.display = 'none';
    actionButtons.style.display = 'block';
  } else {
    tooLateNotice.style.display = 'block';
    actionButtons.style.display = 'none';
  }
}

cancelBtn.addEventListener('click', async () => {
  hideBox(actionMessage);

  const confirmed = confirm('هل أنت متأكد من إلغاء هذا الحجز؟');
  if (!confirmed) return;

  cancelBtn.disabled = true;
  cancelBtn.textContent = 'جاري الإلغاء...';

  const { error } = await supabaseClient.rpc('cancel_my_booking', {
    p_telephone: currentTel,
    p_code: currentCode
  });

  cancelBtn.disabled = false;
  cancelBtn.textContent = 'إلغاء الحجز';

  if (error) {
    return showBox(actionMessage, translateError(error.message), true);
  }

  detailsCard.style.display = 'none';
  successCard.style.display = 'block';
  successTitle.textContent = 'تم إلغاء الحجز';
  successText.textContent = 'تم إلغاء حجزك بنجاح. يمكنك الحجز مرة أخرى في أي وقت.';

  const dateStr = currentBooking.booking_date;
  const timeStr = currentBooking.start_time.substring(0, 5);
  const normalizedTel = normalizePhoneDisplay(currentTel);

  const message = "Bonjour, je souhaite vous informer de l'annulation de mon rendez-vous.\n\n" +
    "Nom : " + currentBooking.nom + "\n" +
    "Prénom : " + currentBooking.prenom + "\n" +
    "Téléphone : " + normalizedTel + "\n" +
    "Date : " + dateStr + "\n" +
    "Heure : " + timeStr + "\n" +
    "Code de réservation : " + currentCode + "\n\n" +
    "Statut : ANNULÉ";

  const waNumber = 

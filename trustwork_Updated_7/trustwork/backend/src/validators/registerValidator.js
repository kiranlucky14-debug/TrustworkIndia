// Validation helpers - pure functions, no dependencies

const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePAN   = (pan)   => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan?.toUpperCase());
const validateGST   = (gst)   => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst?.toUpperCase());
const validateIFSC  = (ifsc)  => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc?.toUpperCase());
const validatePIN   = (pin)   => /^[1-9][0-9]{5}$/.test(pin);

function validateClientRegistration(body) {
  const errors = {};

  // Required
  if (!body.name?.trim())  errors.name  = 'Full name is required';
  if (!body.email?.trim()) errors.email = 'Email is required';
  else if (!validateEmail(body.email)) errors.email = 'Enter a valid email address';

  // City and state required
  if (!body.city?.trim())  errors.city  = 'City is required';
  if (!body.state?.trim()) errors.state = 'State is required';

  // Optional but validated if provided
  if (body.pincode?.trim() && !validatePIN(body.pincode))
    errors.pincode = 'Enter a valid 6-digit pincode';

  if (body.gstNumber?.trim() && !validateGST(body.gstNumber))
    errors.gstNumber = 'Enter a valid GST number (e.g. 22AAAAA0000A1Z5)';

  if (body.panNumber?.trim() && !validatePAN(body.panNumber))
    errors.panNumber = 'Enter a valid PAN number (e.g. ABCDE1234F)';

  if (body.ifscCode?.trim() && !validateIFSC(body.ifscCode))
    errors.ifscCode = 'Enter a valid IFSC code (e.g. HDFC0001234)';

  if (!body.termsAccepted)  errors.termsAccepted  = 'You must accept the Terms & Conditions';
  if (!body.escrowAccepted) errors.escrowAccepted = 'You must accept the Escrow Agreement';

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateFreelancerRegistration(body) {
  const errors = {};

  // Required
  if (!body.name?.trim())  errors.name  = 'Full name is required';
  if (!body.email?.trim()) errors.email = 'Email is required';
  else if (!validateEmail(body.email)) errors.email = 'Enter a valid email address';

  if (!body.city?.trim())  errors.city  = 'City is required';
  if (!body.state?.trim()) errors.state = 'State is required';

  // Bio min length if provided
  if (body.bio?.trim() && body.bio.trim().length < 30)
    errors.bio = 'Bio must be at least 30 characters';

  // Optional but validated if provided
  if (body.panNumber?.trim() && !validatePAN(body.panNumber))
    errors.panNumber = 'Enter a valid PAN number';

  if (body.ifscCode?.trim() && !validateIFSC(body.ifscCode))
    errors.ifscCode = 'Enter a valid IFSC code';

  if (!body.termsAccepted) errors.termsAccepted = 'You must accept the Terms & Conditions';

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = {
  validateClientRegistration,
  validateFreelancerRegistration,
  validatePhone,
  validateEmail,
  validatePAN,
  validateGST,
  validateIFSC,
};
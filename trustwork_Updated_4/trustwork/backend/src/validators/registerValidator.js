// Validation helpers - pure functions, no dependencies

const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePAN   = (pan)   => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan?.toUpperCase());
const validateGST   = (gst)   => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst?.toUpperCase());
const validateIFSC  = (ifsc)  => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc?.toUpperCase());
const validatePIN   = (pin)   => /^[1-9][0-9]{5}$/.test(pin);

function validateClientRegistration(body) {
  const errors = {};

  if (!body.name?.trim())  errors.name  = 'Full name is required';
  if (!body.email?.trim()) errors.email = 'Email is required';
  else if (!validateEmail(body.email)) errors.email = 'Enter a valid email address';

  if (!body.designation?.trim()) errors.designation = 'Designation is required';

  if (!body.city?.trim())    errors.city    = 'City is required';
  if (!body.state?.trim())   errors.state   = 'State is required';
  if (!body.pincode?.trim()) errors.pincode = 'Pincode is required';
  else if (!validatePIN(body.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';

  if (!body.addressLine1?.trim()) errors.addressLine1 = 'Address is required';

  if (!body.businessType?.trim()) errors.businessType = 'Business type is required';

  if (body.gstNumber && !validateGST(body.gstNumber))
    errors.gstNumber = 'Enter a valid GST number (e.g. 22AAAAA0000A1Z5)';

  if (body.panNumber && !validatePAN(body.panNumber))
    errors.panNumber = 'Enter a valid PAN number (e.g. ABCDE1234F)';

  if (body.ifscCode && !validateIFSC(body.ifscCode))
    errors.ifscCode = 'Enter a valid IFSC code (e.g. HDFC0001234)';

  if (!body.termsAccepted)  errors.termsAccepted  = 'You must accept the Terms & Conditions';
  if (!body.escrowAccepted) errors.escrowAccepted = 'You must accept the Escrow Agreement';

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateFreelancerRegistration(body) {
  const errors = {};

  if (!body.name?.trim())  errors.name  = 'Full name is required';
  if (!body.email?.trim()) errors.email = 'Email is required';
  else if (!validateEmail(body.email)) errors.email = 'Enter a valid email address';

  if (!body.city?.trim())  errors.city  = 'City is required';
  if (!body.state?.trim()) errors.state = 'State is required';

  if (!body.title?.trim()) errors.title = 'Professional title is required';
  if (!body.bio?.trim() || body.bio.length < 50)
    errors.bio = 'Bio must be at least 50 characters';

  if (!body.experienceLevel) errors.experienceLevel = 'Experience level is required';

  if (!body.yearsOfExperience || body.yearsOfExperience < 0)
    errors.yearsOfExperience = 'Years of experience is required';

  if (body.panNumber && !validatePAN(body.panNumber))
    errors.panNumber = 'Enter a valid PAN number';

  if (body.ifscCode && !validateIFSC(body.ifscCode))
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

import React from 'react';
import Facility from './Facility';

// ─── Facility Management page ──────────────────────────────────────────────
// Thin page wrapper around Facility.jsx (the amenity/facility CRUD component).
// Split out of Reservation.jsx into its own route so managing the facilities
// list isn't bundled with day-to-day reservation approvals.
const FacilityManagement = () => (
  <div className="min-h-screen bg-[#f8f9fb] p-6 lg:p-8">
    <Facility />
  </div>
);

export default FacilityManagement;

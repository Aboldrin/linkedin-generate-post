import React from 'react';

export const LightBulbIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a7.5 7.5 0 01-7.5 0c-1.255 0-2.42-.158-3.528-.468a11.96 11.96 0 013.528-2.165m7.5 2.633c1.108-.31 2.273-.468 3.528-.468a11.96 11.96 0 01-3.528 2.165m-3.75-2.633a7.5 7.5 0 00-7.5 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75a6.75 6.75 0 11-6.75 6.75 6.75 6.75 0 016.75-6.75zM12 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
    </svg>
);
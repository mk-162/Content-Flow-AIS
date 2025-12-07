import React, { useState, useMemo } from 'react';
import { Globe, X, Check } from 'lucide-react';

// Common regions for quick selection
const REGIONS = {
    'North America': ['US', 'CA', 'MX'],
    'Europe': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'IE'],
    'APAC': ['AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'IN', 'TH', 'MY', 'PH'],
    'South America': ['BR', 'AR', 'CL', 'CO', 'PE'],
    'Middle East': ['AE', 'SA', 'IL', 'QA', 'KW'],
    'Africa': ['ZA', 'NG', 'EG', 'KE', 'MA'],
};

// Country list with names
const COUNTRIES = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
];

interface GeographicTargetingSelectorProps {
    selectedCountries: string[];
    onChange: (countries: string[]) => void;
    className?: string;
}

export const GeographicTargetingSelector: React.FC<GeographicTargetingSelectorProps> = ({
    selectedCountries,
    onChange,
    className = '',
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredCountries = useMemo(() => {
        if (!searchTerm) return COUNTRIES;
        const term = searchTerm.toLowerCase();
        return COUNTRIES.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                c.code.toLowerCase().includes(term)
        );
    }, [searchTerm]);

    const toggleCountry = (code: string) => {
        if (selectedCountries.includes(code)) {
            onChange(selectedCountries.filter((c) => c !== code));
        } else {
            onChange([...selectedCountries, code]);
        }
    };

    const selectRegion = (region: keyof typeof REGIONS) => {
        const regionCodes = REGIONS[region];
        const newSelection = [...new Set([...selectedCountries, ...regionCodes])];
        onChange(newSelection);
    };

    const clearAll = () => {
        onChange([]);
    };

    const selectGlobal = () => {
        onChange(COUNTRIES.map((c) => c.code));
    };

    const selectedCountryData = selectedCountries
        .map((code) => COUNTRIES.find((c) => c.code === code))
        .filter(Boolean);

    return (
        <div className={className}>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    <span>Geographic Targeting</span>
                </div>
            </label>

            {/* Selected Countries Display */}
            {selectedCountries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedCountryData.slice(0, 5).map((country) => (
                        <span
                            key={country!.code}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/30"
                        >
                            <span>{country!.flag}</span>
                            <span>{country!.code}</span>
                            <button
                                onClick={() => toggleCountry(country!.code)}
                                className="hover:text-cyan-300"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {selectedCountries.length > 5 && (
                        <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs">
                            +{selectedCountries.length - 5} more
                        </span>
                    )}
                </div>
            )}

            {/* Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-sm text-slate-300 text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                    <span>
                        {selectedCountries.length === 0
                            ? 'Select countries...'
                            : `${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'} selected`}
                    </span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown Content */}
                        <div className="absolute z-20 w-full mt-1 bg-slate-900 border border-slate-700 shadow-xl max-h-96 overflow-hidden flex flex-col">
                            {/* Search */}
                            <div className="p-3 border-b border-slate-800">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search countries..."
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            {/* Quick Select Regions */}
                            <div className="p-3 border-b border-slate-800">
                                <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                                    Quick Select
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.keys(REGIONS).map((region) => (
                                        <button
                                            key={region}
                                            type="button"
                                            onClick={() => selectRegion(region as keyof typeof REGIONS)}
                                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                                        >
                                            {region}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={selectGlobal}
                                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs transition-colors"
                                    >
                                        Global
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAll}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Country List */}
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {filteredCountries.map((country) => {
                                    const isSelected = selectedCountries.includes(country.code);
                                    return (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => toggleCountry(country.code)}
                                            className={`
                        w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-800 transition-colors
                        ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300'}
                      `}
                                        >
                                            <div className="w-4 h-4 border border-slate-600 flex items-center justify-center">
                                                {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                                            </div>
                                            <span className="text-lg">{country.flag}</span>
                                            <span className="flex-1">{country.name}</span>
                                            <span className="text-xs text-slate-600">{country.code}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedCountries.length === 0 && (
                <p className="text-xs text-slate-600 mt-2">
                    Select target countries or use quick select for regions
                </p>
            )}
        </div>
    );
};

export default GeographicTargetingSelector;

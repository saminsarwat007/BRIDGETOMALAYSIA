/**
 * Malaysian universities relevant to Bridge to Malaysia.
 * Covers public, private, and international branch campuses commonly chosen
 * by Bangladeshi students. Update this list as needed.
 */

export interface University {
  name: string;
  short: string;
  type: "Public" | "Private" | "International Branch";
  city: string;
}

export const MALAYSIAN_UNIVERSITIES: University[] = [
  // Public (Research universities)
  { name: "Universiti Teknologi Malaysia", short: "UTM", type: "Public", city: "Johor Bahru" },
  { name: "Universiti Malaya", short: "UM", type: "Public", city: "Kuala Lumpur" },
  { name: "Universiti Kebangsaan Malaysia", short: "UKM", type: "Public", city: "Bangi" },
  { name: "Universiti Putra Malaysia", short: "UPM", type: "Public", city: "Serdang" },
  { name: "Universiti Sains Malaysia", short: "USM", type: "Public", city: "Penang" },
  { name: "Universiti Teknologi MARA", short: "UiTM", type: "Public", city: "Shah Alam" },
  { name: "International Islamic University Malaysia", short: "IIUM", type: "Public", city: "Gombak" },
  { name: "Universiti Utara Malaysia", short: "UUM", type: "Public", city: "Sintok" },
  { name: "Universiti Malaysia Sabah", short: "UMS", type: "Public", city: "Kota Kinabalu" },
  { name: "Universiti Malaysia Sarawak", short: "UNIMAS", type: "Public", city: "Kota Samarahan" },
  { name: "Universiti Pendidikan Sultan Idris", short: "UPSI", type: "Public", city: "Tanjung Malim" },
  { name: "Universiti Sains Islam Malaysia", short: "USIM", type: "Public", city: "Nilai" },
  { name: "Universiti Malaysia Pahang", short: "UMP", type: "Public", city: "Gambang" },
  { name: "Universiti Malaysia Terengganu", short: "UMT", type: "Public", city: "Kuala Terengganu" },
  { name: "Universiti Malaysia Kelantan", short: "UMK", type: "Public", city: "Kota Bharu" },
  { name: "Universiti Teknikal Malaysia Melaka", short: "UTeM", type: "Public", city: "Durian Tunggal" },
  { name: "Universiti Tun Hussein Onn Malaysia", short: "UTHM", type: "Public", city: "Batu Pahat" },
  { name: "Universiti Sultan Zainal Abidin", short: "UniSZA", type: "Public", city: "Kuala Terengganu" },

  // Private
  { name: "Taylor's University", short: "Taylor's", type: "Private", city: "Subang Jaya" },
  { name: "Sunway University", short: "Sunway", type: "Private", city: "Subang Jaya" },
  { name: "Asia Pacific University", short: "APU", type: "Private", city: "Kuala Lumpur" },
  { name: "Multimedia University", short: "MMU", type: "Private", city: "Cyberjaya / Melaka" },
  { name: "UCSI University", short: "UCSI", type: "Private", city: "Kuala Lumpur" },
  { name: "INTI International University", short: "INTI", type: "Private", city: "Nilai" },
  { name: "MAHSA University", short: "MAHSA", type: "Private", city: "Bandar Saujana Putra" },
  { name: "SEGi University", short: "SEGi", type: "Private", city: "Kota Damansara" },
  { name: "Management & Science University", short: "MSU", type: "Private", city: "Shah Alam" },
  { name: "Universiti Tunku Abdul Rahman", short: "UTAR", type: "Private", city: "Kampar / Sungai Long" },
  { name: "Universiti Tenaga Nasional", short: "UNITEN", type: "Private", city: "Kajang" },
  { name: "Universiti Teknologi PETRONAS", short: "UTP", type: "Private", city: "Seri Iskandar" },
  { name: "Limkokwing University of Creative Technology", short: "Limkokwing", type: "Private", city: "Cyberjaya" },
  { name: "HELP University", short: "HELP", type: "Private", city: "Kuala Lumpur" },
  { name: "Albukhary International University", short: "AIU", type: "Private", city: "Alor Setar" },
  { name: "Quest International University", short: "QIU", type: "Private", city: "Ipoh" },
  { name: "Lincoln University College", short: "Lincoln", type: "Private", city: "Petaling Jaya" },
  { name: "City University Malaysia", short: "City U", type: "Private", city: "Petaling Jaya" },

  // International branch campuses
  { name: "Monash University Malaysia", short: "Monash MY", type: "International Branch", city: "Subang Jaya" },
  { name: "University of Nottingham Malaysia", short: "Nottingham MY", type: "International Branch", city: "Semenyih" },
  { name: "Heriot-Watt University Malaysia", short: "Heriot-Watt MY", type: "International Branch", city: "Putrajaya" },
  { name: "Curtin University Malaysia", short: "Curtin MY", type: "International Branch", city: "Miri" },
  { name: "Swinburne University of Technology Sarawak", short: "Swinburne MY", type: "International Branch", city: "Kuching" },
  { name: "Newcastle University Medicine Malaysia", short: "NUMed", type: "International Branch", city: "Iskandar Puteri" },
  { name: "University of Reading Malaysia", short: "Reading MY", type: "International Branch", city: "Iskandar Puteri" },
  { name: "University of Southampton Malaysia", short: "Southampton MY", type: "International Branch", city: "Iskandar Puteri" },
  { name: "Xiamen University Malaysia", short: "XMU MY", type: "International Branch", city: "Sepang" },
];

/** Group by type for grouped <select> rendering. */
export function universitiesByType() {
  const groups: Record<string, University[]> = {
    Public: [],
    Private: [],
    "International Branch": [],
  };
  for (const u of MALAYSIAN_UNIVERSITIES) groups[u.type].push(u);
  return groups;
}

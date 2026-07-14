import Artikel from '../data/Artikel.js';

function formatTanggalIndo(rawDate) {
    if (!rawDate) return "Baru-baru ini";
    const opsi = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(rawDate).toLocaleDateString('id-ID', opsi);
}

function bersihkanSumber(sumber) {
    if (!sumber) return 'Portal Otomotif';
    
    let nama = sumber.toLowerCase();
    
    const match = nama.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/);
    if (match && match[1]) {
        return match[1];
    }
    
    nama = nama.split('|')[0].split('-')[0].split('—')[0].trim();
    
    return nama.charAt(0).toUpperCase() + nama.slice(1);
}

export const getEdukasiArtikel = async (req, res) => {
    try {
        const semuaArtikelDariDB = await Artikel.find({}).sort({ tanggal: -1 });

        const kataKunciEdukasi = ['rawat', 'perawatan', 'tips', 'servis', 'cara', 'panduan', 'memperbaiki', 'mengatasi', 'motor'];
        
        const artikelEdukasi = semuaArtikelDariDB.filter(art => {
            const judulKecil = art.judul ? art.judul.toLowerCase() : '';
            const ringkasanKecil = art.ringkasan ? art.ringkasan.toLowerCase() : '';
            
            return kataKunciEdukasi.some(keyword => 
                judulKecil.includes(keyword) || ringkasanKecil.includes(keyword)
            );
        });

        const hasilAkhir = artikelEdukasi.map(artikel => {
            return {
                tanggal: formatTanggalIndo(artikel.tanggal),
                judul: artikel.judul,
                ringkasan: artikel.ringkasan ? artikel.ringkasan.substring(0, 120) + '...' : '', 
                link: artikel.link,
                sumber: bersihkanSumber(artikel.sumber)
            };
        });

        res.status(200).json({
            status: "success",
            total_artikel: hasilAkhir.length,
            data: hasilAkhir
        });

    } catch (error) {
        console.error("Error global pada eduController:", error.message);
        res.status(500).json({
            status: "error",
            message: "Gagal memproses artikel edukasi dari database."
        });
    }
};


// controllers/eduController.js
import Parser from 'rss-parser';
const parser = new Parser();

/**
 * Fungsi pembantu untuk mengubah tanggal mentah menjadi format Indonesia
 * Contoh hasil: "24 Jun 2026"
 */
function formatTanggalIndo(rawDate) {
    if (!rawDate) return "Baru-baru ini";
    const opsi = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(rawDate).toLocaleDateString('id-ID', opsi);
}

/**
 * Controller untuk mengambil data artikel edukasi otomotif
 */
const getEdukasiArtikel = async (req, res) => {
    // Daftar URL RSS valid yang sudah disaring sebelumnya
    const daftarSumberRSS = [
        'https://www.wahanahonda.com/rss',
        'https://www.hondacengkareng.com/feed/',
        'https://www.dayaauto.co.id/category/news/artikel/feed/',
        'https://www.federaloil.co.id/rss',
        'https://elangsung.com/feed/'
    ];

    try {
        // Ambil data dari semua website secara bersamaan (paralel)
        const semuaJanjiPencarian = daftarSumberRSS.map(async (url) => {
            try {
                const feed = await parser.parseURL(url);
                const namaSumber = feed.title || "Portal Otomotif";

                // Map data ke dalam properti yang kamu butuhkan
                return feed.items.map(item => {
                    // Bersihkan deskripsi dari tag HTML (seperti gambar atau paragraf kosong)
                    const ringkasanBersih = item.contentSnippet || (item.description ? item.description.replace(/<[^>]*>/g, '') : '');
                    
                    return {
                        tanggal: formatTanggalIndo(item.pubDate),
                        judul: item.title,
                        ringkasan: ringkasanBersih.substring(0, 120) + '...', // Batasi 120 karakter untuk UI card
                        link: item.link,
                        sumber: namaSumber,
                        tanggalMentah: item.pubDate ? new Date(item.pubDate) : new Date(0) // Untuk kebutuhan sorting internal
                    };
                });
            } catch (err) {
                // Jika salah satu web error, abaikan dan lanjut ke web berikutnya
                console.error(`Gagal mengambil data dari ${url}:`, err.message);
                return []; 
            }
        });

        // Tunggu hingga semua website selesai merespon
        const hasilArray2D = await Promise.all(semuaJanjiPencarian);
        
        // Gabungkan semua artikel dari array 2D menjadi satu list rata (array 1D)
        const gabunganArtikel = hasilArray2D.flat();

        // Urutkan dari artikel yang paling baru terbit (Descending)
        gabunganArtikel.sort((a, b) => b.tanggalMentah - a.tanggalMentah);

        // Bentuk ulang data untuk membuang properti 'tanggalMentah' agar respon API bersih
        const hasilAkhir = gabunganArtikel.map(artikel => {
            return {
                tanggal: artikel.tanggal,
                judul: artikel.judul,
                ringkasan: artikel.ringkasan,
                link: artikel.link,
                sumber: artikel.sumber
            };
        });

        // Kirim respon sukses ke aplikasi mobile kamu
        res.status(200).json({
            status: "success",
            total_artikel: hasilAkhir.length,
            data: hasilAkhir
        });

    } catch (error) {
        console.error("Error global pada eduController:", error.message);
        res.status(500).json({
            status: "error",
            message: "Gagal memproses artikel edukasi."
        });
    }
};

// Ekspor menggunakan gaya ES Modules (.js)
export {
    getEdukasiArtikel
};
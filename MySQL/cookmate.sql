CREATE DATABASE IF NOT EXISTS cookmate
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE cookmate;
CREATE TABLE VaiTro (
    idVaiTro INT AUTO_INCREMENT PRIMARY KEY,
    tenVaiTro VARCHAR(50) NOT NULL UNIQUE,
    moTa VARCHAR(255),
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE NguoiDung (
    idNguoiDung INT AUTO_INCREMENT PRIMARY KEY,
    idVaiTro INT NOT NULL,
    hoTen VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    matKhau VARCHAR(255) NOT NULL,
    soDienThoai VARCHAR(20),
    anhDaiDien VARCHAR(255),
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fkNguoiDungVaiTro
        FOREIGN KEY (idVaiTro)
        REFERENCES VaiTro(idVaiTro)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
CREATE TABLE DanhMuc (
    idDanhMuc INT AUTO_INCREMENT PRIMARY KEY,
    tenDanhMuc VARCHAR(100) NOT NULL UNIQUE,
    moTa TEXT,
    anh VARCHAR(255),
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE MonAn (
    idMonAn INT AUTO_INCREMENT PRIMARY KEY,
    idDanhMuc INT NOT NULL,
    tenMonAn VARCHAR(200) NOT NULL,
    moTa TEXT,
    gioiThieu TEXT,
    anhDaiDien VARCHAR(255),
    thoiGianChuanBi INT NOT NULL DEFAULT 0,
    thoiGianNau INT NOT NULL DEFAULT 0,
    tongThoiGian INT NOT NULL DEFAULT 0,
    doKho VARCHAR(30) NOT NULL DEFAULT 'DE',
    khauPhan INT NOT NULL DEFAULT 1,
    luotXem INT NOT NULL DEFAULT 0,
    diemDanhGia DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fkMonAnDanhMuc
        FOREIGN KEY (idDanhMuc)
        REFERENCES DanhMuc(idDanhMuc)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chkMonAnKhauPhan
        CHECK (khauPhan > 0),

    CONSTRAINT chkMonAnThoiGian
        CHECK (
            thoiGianChuanBi >= 0
            AND thoiGianNau >= 0
        )
);
CREATE TABLE NguyenLieu (
    idNguyenLieu INT AUTO_INCREMENT PRIMARY KEY,
    tenNguyenLieu VARCHAR(150) NOT NULL UNIQUE,
    donViMacDinh VARCHAR(50),
    moTa TEXT,
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE MonAnNguyenLieu (
    idMonAn INT NOT NULL,
    idNguyenLieu INT NOT NULL,
    soLuong DECIMAL(10,2) NOT NULL DEFAULT 0,
    donVi VARCHAR(50) NOT NULL,
    ghiChu VARCHAR(255),
    PRIMARY KEY (
        idMonAn,
        idNguyenLieu
    ),
    CONSTRAINT fkMonAnNguyenLieuMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fkMonAnNguyenLieuNguyenLieu
        FOREIGN KEY (idNguyenLieu)
        REFERENCES NguyenLieu(idNguyenLieu)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
CREATE TABLE BuocNau (
    idBuocNau INT AUTO_INCREMENT PRIMARY KEY,
    idMonAn INT NOT NULL,
    soThuTu INT NOT NULL,
    tieuDe VARCHAR(200),
    huongDan TEXT NOT NULL,
    anh VARCHAR(255),
    thoiGian INT NOT NULL DEFAULT 0,
    ghiChu TEXT,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fkBuocNauMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chkBuocNauThuTu
        CHECK (soThuTu > 0),
    CONSTRAINT chkBuocNauThoiGian
        CHECK (thoiGian >= 0),
    UNIQUE (
        idMonAn,
        soThuTu
    )
);
CREATE TABLE HinhAnhMonAn (
    idHinhAnh INT AUTO_INCREMENT PRIMARY KEY,
    idMonAn INT NOT NULL,
    duongDan VARCHAR(255) NOT NULL,
    moTa VARCHAR(255),
    thuTu INT NOT NULL DEFAULT 1,
    anhDaiDien TINYINT NOT NULL DEFAULT 0,
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fkHinhAnhMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chkHinhAnhThuTu
        CHECK (thuTu > 0)
);
CREATE TABLE YeuThich (
    idNguoiDung INT NOT NULL,
    idMonAn INT NOT NULL,
    ngayThem DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (
        idNguoiDung,
        idMonAn
    ),
    CONSTRAINT fkYeuThichNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkYeuThichMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE DanhGia (
    idDanhGia INT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung INT NOT NULL,
    idMonAn INT NOT NULL,
    soSao INT NOT NULL,
    noiDung TEXT,
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayDanhGia DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fkDanhGiaNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkDanhGiaMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chkDanhGiaSoSao
        CHECK (soSao BETWEEN 1 AND 5),
    UNIQUE (
        idNguoiDung,
        idMonAn
    )
);
CREATE TABLE BinhLuan (
    idBinhLuan INT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung INT NOT NULL,
    idMonAn INT NOT NULL,
    idBinhLuanCha INT NULL,
    noiDung TEXT NOT NULL,
    trangThai TINYINT NOT NULL DEFAULT 1,
    ngayBinhLuan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fkBinhLuanNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkBinhLuanMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkBinhLuanCha
        FOREIGN KEY (idBinhLuanCha)
        REFERENCES BinhLuan(idBinhLuan)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE LichSuNau (
    idLichSu INT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung INT NOT NULL,
    idMonAn INT NOT NULL,
    thoiGianBatDau DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianKetThuc DATETIME NULL,
    trangThai VARCHAR(30) NOT NULL DEFAULT 'DANG_NAU',
    buocHienTai INT NOT NULL DEFAULT 1,
    CONSTRAINT fkLichSuNauNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkLichSuNauMonAn
        FOREIGN KEY (idMonAn)
        REFERENCES MonAn(idMonAn)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chkLichSuNauBuoc
        CHECK (buocHienTai > 0)
);
CREATE TABLE ChiTietLichSuNau (
    idChiTiet INT AUTO_INCREMENT PRIMARY KEY,
    idLichSu INT NOT NULL,
    idBuocNau INT NOT NULL,
    daHoanThanh TINYINT NOT NULL DEFAULT 0,
    thoiGianHoanThanh DATETIME NULL,
    CONSTRAINT fkChiTietLichSuLichSu
        FOREIGN KEY (idLichSu)
        REFERENCES LichSuNau(idLichSu)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkChiTietLichSuBuocNau
        FOREIGN KEY (idBuocNau)
        REFERENCES BuocNau(idBuocNau)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE (
        idLichSu,
        idBuocNau
    )
);
CREATE TABLE ThongBao (
    idThongBao INT AUTO_INCREMENT PRIMARY KEY,
    tieuDe VARCHAR(200) NOT NULL,
    noiDung TEXT NOT NULL,
    loai VARCHAR(50),
    duongDan VARCHAR(255),
    ngayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ThongBaoNguoiDung (
    idThongBao INT NOT NULL,
    idNguoiDung INT NOT NULL,
    daDoc TINYINT NOT NULL DEFAULT 0,
    thoiGianDoc DATETIME NULL,
    PRIMARY KEY (
        idThongBao,
        idNguoiDung
    ),
    CONSTRAINT fkThongBaoNguoiDungThongBao
        FOREIGN KEY (idThongBao)
        REFERENCES ThongBao(idThongBao)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fkThongBaoNguoiDungNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE NhatKyHeThong (
    idNhatKy INT AUTO_INCREMENT PRIMARY KEY,
    idNguoiDung INT NOT NULL,
    hanhDong VARCHAR(100) NOT NULL,
    bangDuLieu VARCHAR(100),
    idBanGhi INT,
    noiDung TEXT,
    thoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fkNhatKyHeThongNguoiDung
        FOREIGN KEY (idNguoiDung)
        REFERENCES NguoiDung(idNguoiDung)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);
SHOW TABLES;
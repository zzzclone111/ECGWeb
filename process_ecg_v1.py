import sys
import scipy.io
import matplotlib.pyplot as plt
import numpy as np
import wfdb
import wfdb.processing
import os

# Đọc đường dẫn đến file .mat và file ảnh đầu ra
input_file = sys.argv[1]
output_folder = sys.argv[2]


# Tạo thư mục đầu ra nếu chưa tồn tại
os.makedirs(output_folder, exist_ok=True)

# Đọc dữ liệu từ file .mat
mat_data = scipy.io.loadmat(input_file)
ecg_data = mat_data['val'] / 1000  # Đổi đơn vị từ digital -> mV
fs = 500  # Tần số lấy mẫu (Hz)
time = np.arange(ecg_data.shape[1]) / fs  # Tạo trục thời gian (giây)

# Danh sách tên các đạo trình ECG
lead_names = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]

# Vẽ từng đạo trình và xác định đỉnh R
for i in range(12):
    plt.figure(figsize=(42, 7))
    # Chọn đạo trình (ví dụ: Lead II là chuẩn nhất để phát hiện đỉnh R)
    ecg_signal = ecg_data[i, :]

    # Sử dụng XQRS để phát hiện đỉnh R
    r_peaks = wfdb.processing.xqrs_detect(sig=ecg_signal, fs=fs)
    
    # Chinh lai bo loc de cho ra dinh R chuan nhat
    r_peaks_corrected = wfdb.processing.correct_peaks(
        ecg_signal, r_peaks, search_radius=50, smooth_window_size=50, peak_dir="up"
    )
    r_peaks_corrected = np.array(r_peaks_corrected, dtype=int)
    
    # Vẽ tín hiệu ECG
    plt.plot(time, ecg_signal, color='red', linewidth=1, label="ECG Signal")

    # Đánh dấu các đỉnh R đã tìm thấy
    plt.scatter(time[r_peaks_corrected], ecg_signal[r_peaks_corrected], color='blue', marker='o', label="R-peaks")

    # Cấu hình lưới chuẩn ECG
    plt.xticks(np.arange(0, max(time) + 1, 0.2))
    plt.yticks(np.arange(-2, 2, 0.5))

    # Vẽ lưới chuẩn
    plt.minorticks_on()
    plt.grid(True, which='minor', linestyle=':', linewidth=0.5, color='gray')
    plt.grid(True, which='major', linestyle='-', linewidth=1, color='black')

    # Đặt tiêu đề và nhãn
    plt.title(f"Lead {lead_names[i]}")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude (mV)")
    plt.legend()

    output_file = os.path.join(output_folder, f"{lead_names[i]}.png")
    plt.savefig(output_file)
    plt.close()


# Vẽ ảnh 12 đạo trình ECG và xác định đỉnh R
# Kích thước khung hình vẽ
plt.figure(figsize=(90, 20))
for i in range(12):
    plt.subplot(4, 3, i+1)

    ecg_signal = ecg_data[i, :]

    r_peaks = wfdb.processing.xqrs_detect(sig=ecg_signal, fs=fs)
    
    # Chinh lai bo loc de cho ra dinh R chuan nhat
    r_peaks_corrected = wfdb.processing.correct_peaks(
        ecg_signal, r_peaks, search_radius=50, smooth_window_size=50, peak_dir="up"
    )
    r_peaks_corrected = np.array(r_peaks_corrected, dtype=int)
    
    # Vẽ tín hiệu ECG
    plt.plot(time, ecg_signal, color='red', linewidth=1, label="ECG Signal")

    # Đánh dấu các đỉnh R đã tìm thấy
    plt.scatter(time[r_peaks_corrected], ecg_signal[r_peaks_corrected], color='blue', marker='o', label="R-peaks")

    # Cấu hình lưới chuẩn ECG
    plt.xticks(np.arange(0, max(time) + 1, 0.2))
    plt.yticks(np.arange(-2, 2, 0.5))

    # Vẽ lưới chuẩn
    plt.minorticks_on()
    plt.grid(True, which='minor', linestyle=':', linewidth=0.5, color='gray')
    plt.grid(True, which='major', linestyle='-', linewidth=1, color='black')

    # Đặt tiêu đề và nhãn
    plt.title(f"Lead {lead_names[i]}")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude (mV)")
    plt.legend()

plt.tight_layout()
output_file = os.path.join(output_folder, "all_leads.png")
plt.savefig(output_file)
plt.close()

#vẽ thử nghiệm các tín hiện trên cùng 1 ảnh để xác định việc các đỉnh R có hay không thẳng hàng
plt.figure(figsize=(42, 7))

# Cấu hình trục và lưới chuẩn ECG
plt.xticks(np.arange(0, max(time) + 1, 0.2))
plt.yticks(np.arange(-2, 2, 0.5))
plt.minorticks_on()
plt.grid(True, which='minor', linestyle=':', linewidth=0.5, color='gray')
plt.grid(True, which='major', linestyle='-', linewidth=1, color='black')

first_r_peaks_corrected = None  # Biến lưu đỉnh R của lần lặp đầu tiên

for i in range(12):
    ecg_signal = ecg_data[i, :]

    # Phát hiện đỉnh R
    r_peaks = wfdb.processing.xqrs_detect(sig=ecg_signal, fs=fs)

    # Chỉnh lại bộ lọc để có đỉnh R chính xác hơn
    r_peaks_corrected = wfdb.processing.correct_peaks(
        ecg_signal, r_peaks, search_radius=50, smooth_window_size=50, peak_dir="up"
    )
    r_peaks_corrected = np.array(r_peaks_corrected, dtype=int)

    plt.scatter(time[r_peaks_corrected], ecg_signal[r_peaks_corrected], color='blue', marker='o')

    # Lưu đỉnh R của lần lặp đầu tiên
    if i == 0:
        first_r_peaks_corrected = time[r_peaks_corrected]

# Vẽ đường thẳng tại vị trí đỉnh R của lần lặp đầu tiên
if first_r_peaks_corrected is not None:
    for r_peak_time in first_r_peaks_corrected:
        plt.axvline(x=r_peak_time, color='green', linestyle='--', linewidth=1, label="First Lead R-Peaks")

# Đặt tiêu đề và nhãn
plt.title("R-Peak Alignment Test")
plt.xlabel("Time (s)")
plt.ylabel("Amplitude (mV)")
plt.legend()

# Lưu hình ảnh
output_file = os.path.join(output_folder, "r_peaks_only.png")
plt.savefig(output_file)
plt.close()
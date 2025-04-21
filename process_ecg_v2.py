# mục tiêu: nội suy các khoảng RR về chung 1 mục tiêu (target_rr_duration)

import sys
import scipy.io
import matplotlib.pyplot as plt
import numpy as np
import wfdb
import wfdb.processing
import os
from scipy.interpolate import interp1d

# Nhận tham số từ dòng lệnh
input_file = sys.argv[1]
output_folder = sys.argv[2]

# Tạo thư mục nếu chưa tồn tại
os.makedirs(output_folder, exist_ok=True)

# Đọc dữ liệu ECG
mat_data = scipy.io.loadmat(input_file)
ecg_data = mat_data['val'] / 1000  # chuyển về mV
fs = 500  # tần số lấy mẫu
time = np.arange(ecg_data.shape[1]) / fs  # trục thời gian ban đầu

# Mục tiêu độ dài 1 chu kỳ tim
target_rr_duration = 1.0

# Tên các đạo trình
lead_names = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]

for i in range(12):
    plt.figure(figsize=(42, 7))

    ecg_signal = ecg_data[i, :]

    # Lần đầu tìm đỉnh R
    r_peaks = wfdb.processing.xqrs_detect(sig=ecg_signal, fs=fs)
    r_peaks_corrected = wfdb.processing.correct_peaks(
        ecg_signal, r_peaks, search_radius=80, smooth_window_size=50, peak_dir="up"
    )
    r_peaks_corrected = np.array(r_peaks_corrected, dtype=int)

    if len(r_peaks_corrected) < 2:
        continue

    new_time = []
    new_ecg_signal = []

    # Nội suy từng đoạn RR
    for j in range(len(r_peaks_corrected) - 1):
        start_idx = r_peaks_corrected[j]
        end_idx = r_peaks_corrected[j + 1]

        if start_idx >= end_idx:
            continue

        t_segment = time[start_idx:end_idx] #Đoạn thời gian tương ứng của đoạn RR
        ecg_segment = ecg_signal[start_idx:end_idx] #Tín hiệu tương ứng trên đoạn RR

        if len(t_segment) < 2:
            continue

        rr_duration = t_segment[-1] - t_segment[0]
        local_scale = target_rr_duration / rr_duration # Tỉ lệ
        new_length = int(len(t_segment) * local_scale) # số lượng mẫu sau nội suy

        new_t_segment = np.linspace(t_segment[0], t_segment[-1], new_length) # mảng tgian mới với số mẫu là new_length
        interp_func = interp1d(t_segment, ecg_segment, kind='cubic') # nội suy
        new_ecg_segment = interp_func(new_t_segment) # tạo thành tín hiệu mới

        new_time.extend(new_t_segment)
        new_ecg_signal.extend(new_ecg_segment)

    if len(new_ecg_signal) == 0:
        continue

    new_ecg_signal = np.array(new_ecg_signal)
    new_time = np.array(new_time)

    # Nội suy lại toàn bộ về sampling đều
    uniform_time = np.arange(new_time[0], new_time[-1], 1 / fs) # mảng tgian đều với tần số lấy mẫu fs
    interp_uniform = interp1d(new_time, new_ecg_signal, kind='cubic', fill_value="extrapolate") #nội suy về lại fs ban đầu
    uniform_ecg_signal = interp_uniform(uniform_time)

    # Tìm đỉnh R sau nội suy toàn cục
    try:
        new_r_peaks = wfdb.processing.xqrs_detect(sig=uniform_ecg_signal, fs=fs)
        new_r_peaks = np.array(new_r_peaks, dtype=int)
        new_r_peaks_time = uniform_time[new_r_peaks]
    except Exception as e:
        new_r_peaks = []
        new_r_peaks_time = []

    # Vẽ
    plt.plot(uniform_time, uniform_ecg_signal, color='red', linewidth=1, label="Interpolated ECG")
    if len(new_r_peaks) > 0:
        plt.scatter(new_r_peaks_time, uniform_ecg_signal[new_r_peaks], color='blue', marker='o', label="R-peaks")

    plt.xticks(np.arange(0, max(uniform_time) + 1, 0.2))
    plt.yticks(np.arange(-2, 2, 0.5))
    plt.minorticks_on()
    plt.grid(True, which='minor', linestyle=':', linewidth=0.5, color='gray')
    plt.grid(True, which='major', linestyle='-', linewidth=1, color='black')

    plt.title(f"Lead {lead_names[i]} (Normalized RR)")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude (mV)")
    plt.legend()

    output_file = os.path.join(output_folder, f"{lead_names[i]}.png")
    plt.savefig(output_file)
    plt.close()

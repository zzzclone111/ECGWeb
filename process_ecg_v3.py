import sys
import scipy.io
import matplotlib.pyplot as plt
import numpy as np
import os
from scipy.signal import butter, filtfilt

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

import numpy as np
import scipy.signal as sg

class RPeakDetector:
    def __init__(self, ecg_signal, samp_freq):
        self.signal = ecg_signal
        self.samp_freq = samp_freq
        self.win_150ms = round(0.15 * samp_freq)

        # Xử lý tín hiệu
        self.filtered = self.bandpass_filter()
        self.derivative = self.derivative_filter()
        self.squared = self.squared_signal()
        self.moving_avg = self.moving_window_integrator()

        # Danh sách peak và các biến dùng trong Pan-Tompkins
        self.peaks = []
        self.probable_peaks = []
        self.r_locs = []

        self.SPKI = self.NPKI = self.SPKF = self.NPKF = 0
        self.Threshold_I1 = self.Threshold_I2 = 0
        self.Threshold_F1 = self.Threshold_F2 = 0
        self.RR1 = []
        self.RR_Low_Limit = self.RR_High_Limit = self.RR_Missed_Limit = 0
        self.RR_Average1 = 0

    def bandpass_filter(self):
        low, high = 5 / (0.5 * self.samp_freq), 15 / (0.5 * self.samp_freq)
        b, a = sg.butter(1, [low, high], btype='bandpass')
        return sg.filtfilt(b, a, self.signal)

    def derivative_filter(self):
        kernel = np.array([1, 2, 0, -2, -1]) * (1 / 8) * self.samp_freq
        return np.convolve(self.filtered, kernel, mode='same')

    def squared_signal(self):
        return self.derivative ** 2

    def moving_window_integrator(self):
        window_len = round(0.15 * self.samp_freq)
        window = np.ones(window_len) / window_len
        return np.convolve(self.squared, window, mode='same')

    def approx_peak(self):
        for i in range(1, len(self.moving_avg) - 1):
            if self.moving_avg[i] > self.moving_avg[i-1] and self.moving_avg[i] > self.moving_avg[i+1]:
                self.peaks.append(i)

    def adjust_rr_interval(self, ind):
        self.RR1 = np.diff(self.peaks[max(0, ind - 8):ind + 1]) / self.samp_freq
        self.RR_Average1 = np.mean(self.RR1) if len(self.RR1) > 0 else 0.8
        self.RR_Low_Limit = 0.92 * self.RR_Average1
        self.RR_High_Limit = 1.16 * self.RR_Average1
        self.RR_Missed_Limit = 1.66 * self.RR_Average1

    def update_thresholds(self):
        self.Threshold_I1 = self.NPKI + 0.25 * (self.SPKI - self.NPKI)
        self.Threshold_F1 = self.NPKF + 0.25 * (self.SPKF - self.NPKF)
        self.Threshold_I2 = 0.5 * self.Threshold_I1
        self.Threshold_F2 = 0.5 * self.Threshold_F1

    def adjust_thresholds(self, peak_val, ind):
        if self.moving_avg[peak_val] >= self.Threshold_I1:
            self.SPKI = 0.125 * self.moving_avg[peak_val] + 0.875 * self.SPKI
            if self.probable_peaks[ind] > self.Threshold_F1:
                self.SPKF = 0.125 * self.filtered[ind] + 0.875 * self.SPKF
                self.r_locs.append(self.probable_peaks[ind])
            else:
                self.NPKF = 0.125 * self.filtered[ind] + 0.875 * self.NPKF
        else:
            self.NPKI = 0.125 * self.moving_avg[peak_val] + 0.875 * self.NPKI
            self.NPKF = 0.125 * self.filtered[ind] + 0.875 * self.NPKF

    def find_t_wave(self, peak_val, RRn, ind, prev_ind):
        if self.moving_avg[peak_val] >= self.Threshold_I1 and 0.2 < RRn < 0.36:
            curr_slope = max(np.diff(self.moving_avg[peak_val - round(self.win_150ms/2): peak_val + 1]))
            last_slope = max(np.diff(self.moving_avg[self.peaks[prev_ind] - round(self.win_150ms/2): self.peaks[prev_ind] + 1]))
            if curr_slope < 0.5 * last_slope:
                self.NPKI = 0.125 * self.moving_avg[peak_val] + 0.875 * self.NPKI
                return
        self.adjust_thresholds(peak_val, ind)

    def searchback(self, peak_val, RRn, sb_win):
        if RRn > self.RR_Missed_Limit:
            win_rr = self.moving_avg[peak_val - sb_win + 1: peak_val + 1]
            coord = np.where(win_rr > self.Threshold_I1)[0]
            if len(coord) > 0:
                x_max = coord[np.argmax(win_rr[coord])]
                if self.filtered[x_max] > self.Threshold_F2:
                    self.r_locs.append(x_max)

    def ecg_searchback(self):
        self.r_locs = np.unique(np.array(self.r_locs).astype(int))
        win_200ms = round(0.2 * self.samp_freq)
        result = []
        for r_val in self.r_locs:
            coord = np.arange(max(0, r_val - win_200ms), min(len(self.signal), r_val + win_200ms))
            if len(coord) > 0:
                x_max = coord[np.argmax(self.signal[coord])]
                result.append(x_max)
        return result

    def find_r_peaks(self):
        self.approx_peak()
        for ind in range(len(self.peaks)):
            peak_val = self.peaks[ind]
            win = np.arange(max(0, peak_val - self.win_150ms), min(peak_val + self.win_150ms, len(self.filtered)))
            max_val = max(self.filtered[win], default=0)
            if max_val != 0:
                x_coord = np.where(self.filtered == max_val)[0][0]
                self.probable_peaks.append(x_coord)

            if ind < len(self.probable_peaks) and ind != 0:
                self.adjust_rr_interval(ind)
                RRn = self.RR1[-1] if len(self.RR1) > 0 else 0.8
                self.searchback(peak_val, RRn, round(RRn * self.samp_freq))
                self.find_t_wave(peak_val, RRn, ind, ind - 1)
            else:
                self.adjust_thresholds(peak_val, ind)

            self.update_thresholds()

        return self.ecg_searchback()


for i in range(12):
    plt.figure(figsize=(42, 7))
    ecg_signal = ecg_data[i, :]

    # Tạo đối tượng và tìm đỉnh R
    detector = RPeakDetector(ecg_signal, samp_freq=fs)
    r_peaks = detector.find_r_peaks()

    # Vẽ tín hiệu ECG
    plt.plot(time, ecg_signal, color='red', linewidth=1, label="ECG Signal")
    plt.scatter(time[r_peaks], ecg_signal[r_peaks], color='blue', marker='o', label="R-peaks")

    # Cấu hình lưới chuẩn ECG
    plt.xticks(np.arange(0, max(time) + 1, 0.2))
    plt.yticks(np.arange(-2, 2, 0.5))
    plt.minorticks_on()
    plt.grid(True, which='minor', linestyle=':', linewidth=0.5, color='gray')
    plt.grid(True, which='major', linestyle='-', linewidth=1, color='black')

    plt.title(f"Lead {lead_names[i]}")
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude (mV)")
    plt.legend()

    output_file = os.path.join(output_folder, f"{lead_names[i]}.png")
    plt.savefig(output_file)
    plt.close()

plt.figure(figsize=(90, 20))
for i in range(12):
    plt.subplot(4, 3, i+1)

    ecg_signal = ecg_data[i, :]

    detector = RPeakDetector(ecg_signal, samp_freq=fs)
    r_peaks = detector.find_r_peaks()

    # Vẽ tín hiệu ECG và xác định đỉnh R
    plt.plot(time, ecg_signal, color='red', linewidth=1, label="ECG Signal")
    plt.scatter(time[r_peaks], ecg_signal[r_peaks], color='blue', marker='o', label="R-peaks")

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
import pandas as pd
import numpy as np
from datetime import timedelta

def generate_room_data(room_id="RM_101", output_file="training_data.csv", days=7):
    print(f"Generating {days} days of data for {room_id}...")
    

    start_time = pd.to_datetime("2026-04-24 00:00:00")
    periods = days * 24 * 12 
    timestamps = [start_time + timedelta(minutes=5*i) for i in range(periods)]
    
    df_base = pd.DataFrame({'timestamp': timestamps})
    df_base['hour'] = df_base['timestamp'].dt.hour
    df_base['minute'] = df_base['timestamp'].dt.minute
    
    time_in_hours = df_base['hour'] + df_base['minute']/60
    df_base['temp_ambient'] = 22 + 4 * np.sin((time_in_hours - 9) * (2 * np.pi / 24))
    df_base['temp_ambient'] += np.random.normal(0, 0.2, periods) 
    df_base['humidity'] = 60 - (df_base['temp_ambient'] - 20) * 2 + np.random.normal(0, 1, periods)
    
    daytime_mask = (df_base['hour'] >= 10) & (df_base['hour'] <= 18)
    window_chance = np.where(daytime_mask, 0.05, 0.005)
    df_base['windows_open'] = np.random.binomial(1, window_chance)
    df_base['windows_open'] = df_base['windows_open'].rolling(window=6, min_periods=1).max().astype(int)

    device_counts = {
        "COMPUTER": 20,
        "FRIDGE": 1,
        "HVAC": 1,
        "LAMP": 8,
        "IDLE": 5
    }

    sockets_data = []
    
    for device_type, count in device_counts.items():
        for i in range(count):
            s = df_base.copy()
            s['socket_id'] = f"SKT_{i+1:02d}"
            
            if device_type == "COMPUTER":
                work_hours = (s['hour'] >= 8) & (s['hour'] <= 18)
                base_load = np.random.uniform(0.01, 0.04)
                active_load = np.random.uniform(0.15, 0.40) 
                is_active = work_hours & (np.random.rand(periods) < 0.8)
                s['kwh'] = np.where(is_active, active_load, base_load) + np.random.normal(0, 0.01, periods)

            elif device_type == "FRIDGE":
                active_load = np.random.uniform(0.7, 0.9)
                cycle = np.tile([active_load, active_load, 0.05, 0.05, 0.05, 0.05], periods // 6 + 1)[:periods]
                s['kwh'] = cycle + np.random.normal(0, 0.02, periods)

            elif device_type == "HVAC":
                hvac_active = (s['temp_ambient'] > 24.5) | ((s['hour'] == 14) & (s['windows_open'] == 1))
                s['kwh'] = np.where(hvac_active, 2.5, 0.05) + np.random.normal(0, 0.05, periods)

            elif device_type == "LAMP":
                evening_mask = (s['hour'] >= 18) & (s['hour'] <= 23)
                is_on = evening_mask & (np.random.rand(periods) < 0.7)
                bulb_wattage = np.random.uniform(0.04, 0.1)
                s['kwh'] = np.where(is_on, bulb_wattage, 0.00) + np.random.normal(0, 0.005, periods)

            elif device_type == "IDLE":
                phantom_load = np.random.uniform(0.001, 0.01)
                s['kwh'] = phantom_load + np.random.normal(0, 0.002, periods)

            sockets_data.append(s)
    final_df = pd.concat(sockets_data, ignore_index=True)
    final_df['room_id'] = room_id
    final_df['kwh'] = final_df['kwh'].clip(lower=0.01)

    def apply_label(row):
        kwh = row['kwh']
        windows = row['windows_open']
        
        if kwh > 1.8 and windows > 0:
            return 3, "Wasteful"
        elif kwh > 1.8 and windows == 0:
            return 2, "High"
        elif kwh > 0.15:
            return 1, "Normal"
        else:
            return 0, "Low"

    labels = final_df.apply(apply_label, axis=1, result_type='expand')
    final_df[['label_id', 'label_name']] = labels
    
    final_df = final_df.sort_values(by=['timestamp', 'socket_id']).reset_index(drop=True)
    columns = ['timestamp', 'room_id', 'socket_id', 'kwh', 'temp_ambient', 'humidity', 'windows_open', 'label_id', 'label_name']
    final_df = final_df[columns]
    
    final_df.to_csv(output_file, index=False)
    print(f"Success! {len(final_df)} rows written to {output_file}.")
    print(f"Total Unique Sockets Generated: {final_df['socket_id'].nunique()}")
    print("\nLabel Distribution:")
    print(final_df['label_name'].value_counts())

def generate_demo_test_data(room_id="ROOM_101", output_file="test_data.csv"):
    print(f"Creating scripted 35-socket demo for {room_id}...")

    start_time = pd.to_datetime("2026-04-25 12:00:00")
    periods = 12 * 6 
    timestamps = [start_time + timedelta(minutes=5*i) for i in range(periods)]
    
    df_base = pd.DataFrame({'timestamp': timestamps})
    
    df_base['temp_ambient'] = np.linspace(22.0, 26.0, periods)
    df_base['humidity'] = 45.0
    
    df_base['windows_open'] = 0
    df_base.loc[24:48, 'windows_open'] = 2

    device_counts = {
        "COMPUTER": 20,
        "FRIDGE": 1,
        "HVAC": 1,
        "LAMP": 8,
        "IDLE": 5
    }

    sockets_data = []


    for device_type, count in device_counts.items():
        for i in range(count):
            s = df_base.copy()
            s['socket_id'] = f"SKT_{i+1:02d}"
            
            if device_type == "COMPUTER":
                # Most computers stay idle (0.05)
                s['kwh'] = 0.05 + np.random.normal(0, 0.01, periods)
                
                # SCRIPTED: Make the first 3 computers "Workstations" that RENDER at the end
                if i < 3:
                    # Rendering starts at interval 48 (4 hours in)
                    # We set power to 2.2kW (High but windows are closed)
                    s.loc[48:, 'kwh'] = 2.2 + np.random.normal(0, 0.05, periods - 48)

            elif device_type == "HVAC":
                s['kwh'] = 0.05 # Idle base
                # SCRIPTED: HVAC spikes during the window-open phase (Interval 24-48)
                s.loc[24:48, 'kwh'] = 2.7 + np.random.normal(0, 0.1, 25)

            elif device_type == "FRIDGE":
                cycle = np.tile([0.8, 0.8, 0.05, 0.05, 0.05, 0.05], periods // 6 + 1)[:periods]
                s['kwh'] = cycle + np.random.normal(0, 0.02, periods)

            elif device_type == "LAMP":
                # Lamps turn on at the very end of the demo (simulating evening)
                s['kwh'] = 0.00
                s.loc[60:, 'kwh'] = 0.06 + np.random.normal(0, 0.005, periods - 60)

            elif device_type == "IDLE":
                s['kwh'] = 0.005 + np.random.normal(0, 0.001, periods)

            sockets_data.append(s)


    final_df = pd.concat(sockets_data, ignore_index=True)
    final_df['room_id'] = room_id
    final_df['kwh'] = final_df['kwh'].clip(lower=0.001)

    def apply_label(row):
        kwh = row['kwh']
        win = row['windows_open']
        if kwh > 1.8 and win > 0: return 3, "Wasteful"
        elif kwh > 1.8 and win == 0: return 2, "High"
        elif kwh > 0.15: return 1, "Normal"
        else: return 0, "Low"

    labels = final_df.apply(apply_label, axis=1, result_type='expand')
    final_df[['label_id', 'label_name']] = labels
    
    final_df = final_df.sort_values(by=['timestamp', 'socket_id']).reset_index(drop=True)
    cols = ['timestamp', 'room_id', 'socket_id', 'kwh', 'temp_ambient', 'humidity', 'windows_open', 'label_id', 'label_name']
    final_df[cols].to_csv(output_file, index=False)
    
    print(f"Success! Generated {final_df['socket_id'].nunique()} sockets.")
    print("Demo check: Rows with 'Wasteful' label:", len(final_df[final_df['label_id']==3]))
    print("Demo check: Rows with 'High' label:", len(final_df[final_df['label_id']==2]))

# generate_demo_test_data()
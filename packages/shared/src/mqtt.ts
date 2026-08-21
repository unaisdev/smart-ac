import type { AirState } from './air-state.ts';
import { MQTT_CONTROLLER_ID } from './air-conditioner.ts';

export function mqttCommandTopic(controllerId = MQTT_CONTROLLER_ID): string {
  return `smartac/device/${controllerId}/command`;
}

export function mqttStateTopic(controllerId = MQTT_CONTROLLER_ID): string {
  return `smartac/device/${controllerId}/state`;
}

export function mqttStatusTopic(controllerId = MQTT_CONTROLLER_ID): string {
  return `smartac/device/${controllerId}/status`;
}

export interface MqttSetStateCommand {
  deviceId: string;
  command: 'setState';
  state: AirState;
  requestId: string;
}

export interface MqttSetStateResponse {
  deviceId: string;
  requestId: string;
  success: boolean;
  state: AirState;
}

export interface MqttDeviceStatus {
  online: boolean;
}

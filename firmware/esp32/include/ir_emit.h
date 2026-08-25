#pragma once

#include <stdbool.h>
#include <stddef.h>

#include "captured_signals.h"

void irEmitBegin();

void irEmitByIndex(size_t index);

bool irEmitPower(bool powerOn);

bool irEmitTempUp();

bool irEmitTempDown();

(*************************************
	顺控名称：HOLLYSYS
	画面输入按钮：
	HOLLYSYS_START		启动置1按钮
	HOLLYSYS_STOP		停止置1按钮
	HOLLYSYS_RESET		复位置1按钮
	HOLLYSYS_PAUSE		暂停开关反转按钮
	HOLLYSYS_LOOP		顺控循环开关反转按钮
	HOLLYSYS_STEP_EN	步使能脉冲按钮，调试时为0运行时为1
	HOLLYSYS_STEP_BP	步条件旁路脉冲按钮
	输入参数：
	HOLLYSYS-TWTM-S1	第1步运行完成后等待时间，单位s
	HOLLYSYS-EXTM-S1	第1步等待条件超时报警时间，单位s
	内部参数：
	HOLLYSYS_STEP_CNT		当前步号（有符号整数）
	HOLLYSYS_STEP_ACT		每步的具体动作，0条件检测，1、2、3动作执行，10初始化下一步（有符号整数）
	HOLLYSYS_WAIT_TIME		顺控等待计时器 （浮点数）
	HOLLYSYS_ALARM_TIME		顺控报警计时器 （浮点数）
	HOLLYSYS_TIME			POU扫描周期时间，500ms （浮点数）
	HOLLYSYS_STEP_IN		顺控运行条件 （布尔量）
	HOLLYSYS_STOP_IN		顺控故障停条件 （布尔量）
	HOLLYSYS_STOP_SW		顺控故障停运行标志 （布尔量）
	HOLLYSYS_STEP_IN_S1		第1步执行条件，在外部POU赋值 （布尔量）
	HOLLYSYS_STEP_JUMP_S1	第1步执行跳步条件，在外部POU赋值 （布尔量）
	HOLLYSYS_STEP_OUT_S1	第1步动作执行输出标志，用于其他顺控或逻辑 （布尔量）
	HOLLYSYS_STEP_ALA_S1	第1步执行报警标志 （布尔量）
**************************************)
(*复位画面按钮，进入初始步-1*)
IF HOLLYSYS_RESET = TRUE THEN
	HOLLYSYS_START := FALSE;		(*取消启动*)
	HOLLYSYS_PAUSE := FALSE;		(*取消终止*)
	HOLLYSYS_STOP := FALSE;			(*取消停止*)
	HOLLYSYS_STEP_BP := FALSE;		(*取消旁路*)
	HOLLYSYS_RESET := FALSE;		(*复位完成*)
	HOLLYSYS_LOOP := FALSE;			(*取消循环*)
	HOLLYSYS_STEP_CNT := -1;		(*进入初始步-1*)
END_IF
(******判断是否有程序暂停，没有的话开始执行程序******)
IF NOT(HOLLYSYS_PAUSE = TRUE) THEN
	(*循环检测停止条件*)
	HOLLYSYS_STOP_IN := HOLLYSYS_STOP_IN;
	(*顺控停止条件满足，并且本次顺控未执行过停止S100步*)
	IF HOLLYSYS_STOP_IN = TRUE AND HOLLYSYS_STOP_SW = FALSE THEN
		HOLLYSYS_STOP_SW := TRUE;	(*S100步执行标志置1*)
		HOLLYSYS_STEP_CNT := 100;	(*进入S100步停止顺控*)
	END_IF
	IF HOLLYSYS_STEP_CNT <> -1 THEN
		(*******计时器累加*********)
		HOLLYSYS_WAIT_TIME := HOLLYSYS_WAIT_TIME + HOLLYSYS_TIME;
		HOLLYSYS_ALARM_TIME := HOLLYSYS_ALARM_TIME + HOLLYSYS_TIME;
	END_IF
	CASE HOLLYSYS_STEP_CNT OF
	-1:	(*顺控初始化*)
		(*******初始化顺控里停止的标志*********)
		HOLLYSYS_STOP_SW := FALSE;
		HOLLYSYS_STOP_IN := FALSE;
		(*******初始化顺控里步的标志*********)
		(*******初始化顺控里时间计数*********)
		HOLLYSYS_WAIT_TIME := 0;
		HOLLYSYS_ALARM_TIME := 0; 
		HOLLYSYS_TIME := 0.5;
		HOLLYSYS_STEP_IN := HOLLYSYS_STEP_IN;
		(*******进入顺控开始步*******)
		IF HOLLYSYS_STEP_IN = TRUE AND HOLLYSYS_START THEN
			HOLLYSYS_STEP_CNT :=0;
			HOLLYSYS_STEP_ACT :=0;
		END_IF
	(******顺控第一步开始******)
	(******顺控最后一步开始******)
	(******顺控分支步开始******)
	(******故障停止步开始******)
	0:	(*步描述：S0*)
		(*******步条件判断*********)
		HOLLYSYS_STEP_IN_S0 := HOLLYSYS_STEP_IN_S0;
		HOLLYSYS_STEP_JUMP_S0 := HOLLYSYS_STEP_JUMP_S0;
		IF HOLLYSYS_STEP_ACT = 0 THEN
			(*******条件超时报警*********)
			IF (HOLLYSYS_ALARM_TIME > HOLLYSYS_EXTM_S0) AND (HOLLYSYS_EXTM_S0 > 0) THEN
				HOLLYSYS_STEP_ALA_S0 := TRUE;
			END_IF
			(*******跳转条件满足跳转*********)
			IF HOLLYSYS_STEP_JUMP_S0 = TRUE THEN
				HOLLYSYS_STEP_CNT :=100;
			END_IF
			(*******步条件满足执行动作*********)
			IF HOLLYSYS_STEP_IN_S0 = TRUE OR HOLLYSYS_STEP_BP = TRUE THEN
				(*执行下阶段动作*)
				HOLLYSYS_STEP_ACT :=1;
			END_IF
		END_IF
		IF HOLLYSYS_STEP_ACT = 1 THEN
			(*执行下阶段动作,清零等待计时*)
			HOLLYSYS_WAIT_TIME :=0;
			HOLLYSYS_STEP_OUT_S0 :=TRUE;
			HOLLYSYS_STEP_ACT :=10;
		END_IF
		IF HOLLYSYS_STEP_ACT = 10 THEN
			IF HOLLYSYS_WAIT_TIME > HOLLYSYS_TWTM_S0 + 0.5 THEN		(*至少等待0.5S确保本步输出与下步输出有间隔*)
				IF HOLLYSYS_STEP_EN = TRUE THEN
					HOLLYSYS_STEP_ACT :=0;				(*复位动作标志*)
					HOLLYSYS_STEP_ALA_S0 := FALSE;		(*复位报警标志*)
					HOLLYSYS_WAIT_TIME := 0;			(*复位等待时间*)
					HOLLYSYS_ALARM_TIME := 0;			(*复位报警时间*)
					HOLLYSYS_STEP_CNT :=1;				(*进入下一步*)
				END_IF
			END_IF
		END_IF
	1:	(*最后步描述：S1*)
		(*******步条件判断*********)
		HOLLYSYS_STEP_IN_S1 := HOLLYSYS_STEP_IN_S1;
		HOLLYSYS_STEP_JUMP_S1 := HOLLYSYS_STEP_JUMP_S1;
		IF HOLLYSYS_STEP_ACT = 0 THEN
			(*******条件超时报警*********)
			IF (HOLLYSYS_ALARM_TIME > HOLLYSYS_EXTM_S1) AND (HOLLYSYS_EXTM_S1 > 0) THEN
				HOLLYSYS_STEP_ALA_S1 := TRUE;
			END_IF
			(*******跳转条件满足跳转*********)
			IF HOLLYSYS_STEP_JUMP_S1 = TRUE THEN
				HOLLYSYS_STEP_CNT :=100;
			END_IF
			(*******步条件满足执行动作*********)
			IF HOLLYSYS_STEP_IN_S1 = TRUE OR HOLLYSYS_STEP_BP = TRUE THEN
				(*执行下阶段动作*)
				HOLLYSYS_STEP_ACT :=1;
			END_IF
		END_IF
		IF HOLLYSYS_STEP_ACT = 1 THEN
			(*执行下阶段动作,清零等待计时*)
			HOLLYSYS_WAIT_TIME :=0;
			HOLLYSYS_STEP_OUT_S1 :=TRUE;
			HOLLYSYS_STEP_ACT :=10;
		END_IF
		IF HOLLYSYS_STEP_ACT = 10 THEN
			IF HOLLYSYS_WAIT_TIME > HOLLYSYS_TWTM_S1 + 0.5 THEN		(*至少等待0.5S确保本步输出与下步输出有间隔*)
				IF HOLLYSYS_STEP_EN = TRUE THEN
					HOLLYSYS_STEP_ACT :=0;				(*复位动作标志*)
					HOLLYSYS_STEP_ALA_S1 := FALSE;		(*复位报警标志*)
					HOLLYSYS_WAIT_TIME := 0;			(*复位等待时间*)
					HOLLYSYS_ALARM_TIME := 0;			(*复位报警时间*)
					IF HOLLYSYS_LOOP = TRUE THEN
						HOLLYSYS_STEP_CNT :=-1;			(*开始循环*)
					ELSE
						HOLLYSYS_RESET := TRUE;			(*进入复位按钮*)
					END_IF
				END_IF
			END_IF
		END_IF
	100:(*停止步描述：S100*)
		(*******步条件判断*********)
		HOLLYSYS_STEP_IN_S100 := HOLLYSYS_STEP_IN_S100;
		HOLLYSYS_STEP_JUMP_S100 := HOLLYSYS_STEP_JUMP_S100;
		IF HOLLYSYS_STEP_ACT = 0 THEN
			(*******条件超时报警*********)
			IF (HOLLYSYS_ALARM_TIME > HOLLYSYS_EXTM_S100) AND (HOLLYSYS_EXTM_S100 > 0) THEN
				HOLLYSYS_STEP_ALA_S100 := TRUE;
			END_IF
			(*******跳转条件满足跳转*********)
			IF HOLLYSYS_STEP_JUMP_S100 = TRUE THEN
				HOLLYSYS_STEP_CNT :=100;
			END_IF
			(*******步条件满足执行动作*********)
			IF HOLLYSYS_STEP_IN_S100 = TRUE OR HOLLYSYS_STEP_BP = TRUE THEN
				(*执行下阶段动作*)
				HOLLYSYS_STEP_ACT :=1;
			END_IF
		END_IF
		IF HOLLYSYS_STEP_ACT = 1 THEN
			(*执行下阶段动作,清零等待计时*)
			HOLLYSYS_WAIT_TIME :=0;
			HOLLYSYS_STEP_OUT_S100 :=TRUE;
			HOLLYSYS_STEP_ACT :=10;
		END_IF
		IF HOLLYSYS_STEP_ACT = 10 THEN
			IF HOLLYSYS_WAIT_TIME > HOLLYSYS_TWTM_S100 + 0.5 THEN		(*至少等待0.5S确保本步输出与下步输出有间隔*)
				IF HOLLYSYS_STEP_EN = TRUE THEN
					HOLLYSYS_STEP_ACT :=0;				(*复位动作标志*)
					HOLLYSYS_STEP_ALA_S100 := FALSE;	(*复位报警标志*)
					HOLLYSYS_WAIT_TIME := 0;			(*复位等待时间*)
					HOLLYSYS_ALARM_TIME := 0;			(*复位报警时间*)
					(*HOLLYSYS_STEP_CNT :=101;*)(*进入下一步*)	(*HOLLYSYS_RESET := TRUE;*)(*进入复位按钮*)
				END_IF
			END_IF
		END_IF
	END_CASE
END_IF
CREATE OR REPLACE FUNCTION public.login_unificado(
    p_identificacion text,
    p_tipodoc        text,
    p_password       text,
    p_captcha_token  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario RECORD;
BEGIN
    -- 1️⃣ Obtener registro del usuario (misma vista que antes)
    SELECT * INTO v_usuario
      FROM public.v_perfil_usuario
     WHERE identificacion = p_identificacion
       AND tipodoc = p_tipodoc::text;

    -- Validar captcha
    IF NOT verify_captcha(p_captcha_token) THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Captcha inválido o ausente.'
        );
    END IF;

    -- 2️⃣ Si no existe usuario → error
    IF v_usuario IS NULL THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Usuario no encontrado o credenciales inválidas.'
        );
    END IF;

    -- 3️⃣ Verificar que la cuenta esté activa
    IF v_usuario.estado <> 'Activo' THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'La cuenta se encuentra inactiva. Contacte al administrador.'
        );
    END IF;

    -- 4️⃣ Usuario sin password (debe crear una)
    IF v_usuario.password_hash IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'success',
            'user', jsonb_build_object(
                'id',                     v_usuario.id,
                'nombre',                 v_usuario.nombre,
                'rol',                    v_usuario.rol,
                'identificacion',         v_usuario.identificacion,
                'tipodoc',                v_usuario.tipodoc,
                'nombre_institucion',    v_usuario.nombre_institucion,
                'estado',                v_usuario.estado,
                'debe_cambiar_password', true,
                'tiene_password',        false
            )
        );
    END IF;

    -- 5️⃣ Comparar hash de contraseña (se asume hash sin sal, idéntico a la versión original)
    IF v_usuario.password_hash <> p_password THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Contraseña incorrecta.'
        );
    END IF;

    -- 6️⃣ Todo OK → devolver datos del usuario
    RETURN jsonb_build_object(
        'status', 'success',
        'user', jsonb_build_object(
            'id',                     v_usuario.id,
            'nombre',                 v_usuario.nombre,
            'rol',                    v_usuario.rol,
            'identificacion',         v_usuario.identificacion,
            'tipodoc',                v_usuario.tipodoc,
            'nombre_institucion',    v_usuario.nombre_institucion,
            'estado',                v_usuario.estado,
            'debe_cambiar_password', v_usuario.debe_cambiar_password,
            'tiene_password',        true
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status',  'error',
            'message', 'Error interno al validar el acceso.',
            'detail',  SQLERRM
        );
END;
$function$;
